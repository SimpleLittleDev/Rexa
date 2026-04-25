import { createId } from "../common/result";
import type { LLMRouter } from "../llm/llm-router";
import type { MemoryManager } from "../memory/memory-manager";
import { DynamicSubAgentDesigner } from "../subagents/dynamic-subagent-designer";
import { SubAgentManager } from "../subagents/subagent-manager";
import { defaultAppConfig, type AgentsConfig, type AppConfig } from "../app/config";
import { BrowserWorkflow } from "./browser-workflow";
import type { BrowserAgentObserver } from "../tools/browser/browser-agent-observer";
import { createBrowserTool, type BrowserToolFactory } from "../tools/browser/browser-tool-factory";
import { Planner } from "./planner";
import { Validator } from "./validator";
import { TaskStateMachine, type TaskState } from "./task-state";

export interface RexaRunOptions {
  userId?: string;
  onProgress?: (message: string) => Promise<void> | void;
  browserObserver?: BrowserAgentObserver;
}

export interface RexaRunResult {
  taskId: string;
  status: string;
  response: string;
  plan: string[];
  subagents: string[];
}

export class Orchestrator {
  private readonly planner = new Planner();
  private readonly subagents: SubAgentManager;
  private readonly subAgentDesigner: DynamicSubAgentDesigner;
  private readonly validator = new Validator();

  constructor(
    private readonly router: LLMRouter,
    private readonly memory: MemoryManager,
    private readonly agentsConfig: AgentsConfig,
    private readonly appConfig: AppConfig = defaultAppConfig(),
    private readonly browserToolFactory: BrowserToolFactory = (options) =>
      createBrowserTool(appConfig, { ...options, router: options?.router ?? router }),
  ) {
    this.subagents = new SubAgentManager(router);
    this.subAgentDesigner = new DynamicSubAgentDesigner(router, agentsConfig);
  }

  async handle(message: string, options: RexaRunOptions = {}): Promise<RexaRunResult> {
    const userId = options.userId ?? "local";
    const taskId = createId("task");
    const progress = async (text: string) => {
      await options.onProgress?.(text);
    };
    const state = new TaskStateMachine(initialTaskState(taskId, userId));

    state.transition("planning");
    await progress("Memahami intent dan mengambil memory relevan.");
    const plan = this.planner.createPlan(message);
    state.setPlan(plan.steps);
    const chatScope = `chat:${userId}`;
    const recentTurnsLimit = this.appConfig.tokenSaver.enabled
      ? this.appConfig.tokenSaver.maxHistoryTurns
      : 10;
    // Summarise long-term memory from non-chat scopes only — chat
    // history is delivered via `recentTurns` below. Mixing the two
    // causes exponential prompt blow-up, because each assistant turn
    // already embeds the previous prompt's context.
    const [taskMemory, recentChatTurns] = await Promise.all([
      this.memory.summarize(message, { scope: "task", limit: 5 }),
      this.memory.recentTurns(chatScope, recentTurnsLimit * 2),
    ]);
    const memoryContext = truncate(taskMemory, 1200);
    const chatHistory = recentChatTurns
      .map((turn) => {
        const speaker = turn.type === "user-turn" ? "User" : "Rexa";
        return `${speaker}: ${truncate(turn.text, 400)}`;
      })
      .join("\n");
    // Persist this turn's user message immediately so future turns see it
    // even if the assistant turn errors out below.
    await this.memory.remember({
      scope: chatScope,
      type: "user-turn",
      text: message,
      importance: 0.4,
      tags: ["chat", plan.intent.type],
    });

    state.transition("running");
    const role = this.appConfig.tokenSaver.enabled && this.appConfig.tokenSaver.preferCheapRole
      ? "cheap"
      : plan.recommendedRole;
    if (this.appConfig.tokenSaver.enabled && plan.steps.length > this.appConfig.tokenSaver.maxPlannerSteps) {
      plan.steps = plan.steps.slice(0, this.appConfig.tokenSaver.maxPlannerSteps);
      state.setPlan(plan.steps);
    }
    await progress(`Memilih role model: ${role}${role !== plan.recommendedRole ? " (token-saver)" : ""}.`);

    if (plan.intent.type === "browser") {
      const responseText = await this.executeBrowserTask(message, options);
      await Promise.all([
        this.memory.remember({
          scope: "task",
          type: "task-result",
          text: `Task ${taskId}: ${truncate(message, 500)}\nResult: ${truncate(responseText, 800)}`,
          importance: 0.5,
          tags: [plan.intent.type, "browser-tool"],
        }),
        this.memory.remember({
          scope: chatScope,
          type: "assistant-turn",
          text: truncate(responseText, 1500),
          importance: 0.4,
          tags: ["chat", "browser"],
        }),
      ]);
      state.setResult(responseText);
      state.transition(responseText.startsWith("Browser gagal") ? "failed" : "completed");
      await progress("Task browser selesai dan evidence dikirim bila tersedia.");
      return {
        taskId,
        status: state.snapshot().status,
        response: responseText,
        plan: plan.steps,
        subagents: [],
      };
    }

    const subagentIds: string[] = [];
    let subagentSummary = "";
    if (plan.intent.needsSubAgent) {
      await progress("Main agent mendesain sub-agent runtime sesuai kebutuhan task.");
      const proposals = await this.subAgentDesigner.design({
        userMessage: message,
        memoryContext,
        plannerSteps: plan.steps,
      });

      for (const proposal of proposals) {
        await progress(`Membuat sub-agent ${proposal.name} (${proposal.role}).`);
        const agent = await this.subagents.spawnAgent(proposal);
        subagentIds.push(agent.agentId);
        const result = await this.subagents.sendTask(agent.agentId, {
          taskId,
          input: `Task: ${proposal.task}\n\nOriginal user request: ${message}\n\nRelevant memory:\n${memoryContext}`,
        });
        const validation = this.validator.validateSubAgentResult(result);
        subagentSummary += `\n\nSub-agent ${result.name} (${result.role}): ${result.summary}\nValidation: ${validation.valid ? "valid" : validation.risks.join(", ")}`;
        if (result.status !== "completed") {
          await progress(`Sub-agent ${result.name} gagal, mencoba fallback role ${plan.recommendedRole}.`);
          const fallback = await this.router.generateForRole(role, {
            messages: [
              { role: "system", content: "You are Rexa fallback executor. Summarize the task and propose the next safe step." },
              { role: "user", content: `Original task: ${message}\nSub-agent failure: ${result.summary}` },
            ],
          });
          subagentSummary += `\nFallback provider ${fallback.provider}: ${fallback.text}`;
        }
      }
    }

    const systemPrompt = this.appConfig.tokenSaver.enabled ? SYSTEM_PROMPT_LITE : SYSTEM_PROMPT;
    const userBlock = [
      `User request: ${message}`,
      `Detected intent: ${plan.intent.type} (multiStep=${plan.intent.multiStep}, risk=${plan.intent.risk})`,
      `Planner steps:\n${plan.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`,
      `Relevant long-term memory:\n${memoryContext || "(empty)"}`,
      `Recent conversation (last ${recentChatTurns.length} turns):\n${chatHistory || "(no prior turns)"}`,
    ];
    if (subagentSummary) userBlock.push(`Sub-agent results:${subagentSummary}`);
    const response = await this.router.generateForRole(role, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userBlock.join("\n\n") },
      ],
    });

    await Promise.all([
      this.memory.remember({
        scope: "task",
        type: "task-result",
        // Cap stored task summary to prevent it from carrying entire
        // assistant transcripts back into future prompts.
        text: `Task ${taskId}: ${truncate(message, 500)}\nResult: ${truncate(response.text, 800)}`,
        importance: 0.5,
        tags: [plan.intent.type, response.provider],
      }),
      this.memory.remember({
        scope: chatScope,
        type: "assistant-turn",
        text: truncate(response.text, 1500),
        importance: 0.4,
        tags: ["chat", plan.intent.type, response.provider],
      }),
    ]);
    state.setResult(response.text);
    state.transition("completed");
    await progress("Task selesai dan memory task diperbarui.");

    return {
      taskId,
      status: state.snapshot().status,
      response: response.text,
      plan: plan.steps,
      subagents: subagentIds,
    };
  }

  private async executeBrowserTask(message: string, options: RexaRunOptions): Promise<string> {
    if (!this.appConfig.browserAgent.enabled) {
      return "Browser agent sedang nonaktif di config. Aktifkan `browserAgent.enabled` lewat `rexa setup` untuk membuka browser dan mengirim screenshot.";
    }
    const browser = this.browserToolFactory({ observer: options.browserObserver });
    const workflow = new BrowserWorkflow(browser, {
      pointerEnabled: this.appConfig.browserAgent.pointerEnabled,
    });
    return (await workflow.run(message)).summary;
  }
}

const SYSTEM_PROMPT = [
  "You are Rexa, a personal autonomous AI assistant.",
  "You are versatile across coding, research, writing, analysis, math, planning, browser automation, terminal tasks, data wrangling and creative ideation.",
  "Always respond in the same language as the user (Bahasa Indonesia or English).",
  "Be concise but thorough; lead with the answer or action and then provide a brief justification.",
  "Use the planner steps as a checklist – complete the relevant ones and skip those that don't apply.",
  "When you are unsure or risk irreversible actions (sending, publishing, deleting, paying), ask for confirmation first.",
  "Cite sources or quote evidence when you have them; if memory is empty, state assumptions clearly.",
  "Never reveal private chain-of-thought; share only the final reasoning and conclusions the user needs.",
].join(" ");

const SYSTEM_PROMPT_LITE = [
  "You are Rexa in token-saver mode.",
  "Answer in 1-3 sentences. No filler, no chain-of-thought.",
  "Match the user's language. Skip planner steps that don't apply.",
  "Refuse irreversible actions unless explicitly confirmed.",
].join(" ");

function truncate(text: string, max: number): string {
  if (typeof text !== "string") return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function initialTaskState(taskId: string, userId: string): TaskState {
  return {
    taskId,
    userId,
    status: "pending",
    currentStep: 0,
    plan: [],
    selectedTools: [],
    selectedModels: [],
    subagents: [],
    logs: [],
    confirmations: [],
  };
}
