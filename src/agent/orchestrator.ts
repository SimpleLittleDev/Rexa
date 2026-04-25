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
    private readonly browserToolFactory: BrowserToolFactory = (options) => createBrowserTool(appConfig, options),
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
    const memoryContext = await this.memory.summarize(message);

    state.transition("running");
    await progress(`Memilih role model: ${plan.recommendedRole}.`);

    if (plan.intent.type === "browser") {
      const responseText = await this.executeBrowserTask(message, options);
      await this.memory.remember({
        scope: "task",
        type: "task-result",
        text: `Task ${taskId}: ${message}\nResult: ${responseText}`,
        importance: 0.5,
        tags: [plan.intent.type, "browser-tool"],
      });
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
          const fallback = await this.router.generateForRole(plan.recommendedRole, {
            messages: [
              { role: "system", content: "You are Rexa fallback executor. Summarize the task and propose the next safe step." },
              { role: "user", content: `Original task: ${message}\nSub-agent failure: ${result.summary}` },
            ],
          });
          subagentSummary += `\nFallback provider ${fallback.provider}: ${fallback.text}`;
        }
      }
    }

    const response = await this.router.generateForRole(plan.recommendedRole, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `User request: ${message}\n\nDetected intent: ${plan.intent.type} (multiStep=${plan.intent.multiStep}, risk=${plan.intent.risk})\n\nPlanner steps:\n${plan.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}\n\nRelevant memory:\n${memoryContext || "(empty)"}${subagentSummary}`,
        },
      ],
    });

    await this.memory.remember({
      scope: "task",
      type: "task-result",
      text: `Task ${taskId}: ${message}\nResult: ${response.text}`,
      importance: 0.5,
      tags: [plan.intent.type, response.provider],
    });
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
