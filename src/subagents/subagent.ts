import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createId } from "../common/result";
import type { LLMRequest, LLMResponse } from "../llm/llm-provider.interface";

export interface AgentBudget {
  maxToolCalls: number;
  maxExecutionTimeMs: number;
  maxCostUsd: number;
}

export interface SubAgentConfig {
  name: string;
  role: string;
  provider: string;
  model: string;
  tools: string[];
  memoryScope: "global" | "task-only" | "read-only" | string;
  systemPrompt?: string;
  budget?: AgentBudget;
}

export interface SubAgentTask {
  taskId: string;
  input: string;
  metadata?: Record<string, unknown>;
}

export interface SubAgentResult {
  agentId: string;
  name: string;
  role: string;
  provider: string;
  model: string;
  taskId: string;
  status: "completed" | "failed" | "blocked" | "cancelled";
  summary: string;
  findings: string[];
  filesChanged: string[];
  commandsRun: string[];
  risks: string[];
  needsUserConfirmation: boolean;
  recommendedNextStep: string;
  rawOutputPath: string;
}

export interface LLMRouterLike {
  generateForProvider(selection: { provider: string; model: string }, request: LLMRequest): Promise<LLMResponse>;
}

export class SubAgent {
  readonly agentId: string;
  status: "idle" | "running" | "stopped" = "idle";
  private taskCount = 0;

  constructor(
    readonly config: SubAgentConfig,
    private readonly router: LLMRouterLike,
  ) {
    this.agentId = createId(`agent_${config.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`);
  }

  async run(task: SubAgentTask): Promise<SubAgentResult> {
    this.enforceBudget();
    this.status = "running";
    const rawOutputPath = join("logs", "subagents", `${this.agentId}.log`);

    try {
      const response = await this.router.generateForProvider(
        { provider: this.config.provider, model: this.config.model },
        {
          messages: [
            {
              role: "system",
              content:
                this.config.systemPrompt ??
                `You are ${this.config.name}, a ${this.config.role}. Return concise structured findings.`,
            },
            { role: "user", content: task.input },
          ],
        },
      );

      await writeAgentLog(rawOutputPath, response.text);
      this.taskCount += 1;
      this.status = "idle";
      return {
        agentId: this.agentId,
        name: this.config.name,
        role: this.config.role,
        provider: this.config.provider,
        model: this.config.model,
        taskId: task.taskId,
        status: "completed",
        summary: response.text.slice(0, 500),
        findings: [response.text],
        filesChanged: [],
        commandsRun: [],
        risks: [],
        needsUserConfirmation: false,
        recommendedNextStep: "Validate sub-agent result and continue the plan",
        rawOutputPath,
      };
    } catch (error) {
      this.status = "idle";
      const message = error instanceof Error ? error.message : String(error);
      await writeAgentLog(rawOutputPath, `ERROR: ${message}`);
      return {
        agentId: this.agentId,
        name: this.config.name,
        role: this.config.role,
        provider: this.config.provider,
        model: this.config.model,
        taskId: task.taskId,
        status: "failed",
        summary: message,
        findings: [],
        filesChanged: [],
        commandsRun: [],
        risks: [message],
        needsUserConfirmation: false,
        recommendedNextStep: "Try fallback provider or reduce task scope",
        rawOutputPath,
      };
    }
  }

  stop(): void {
    this.status = "stopped";
  }

  private enforceBudget(): void {
    const maxToolCalls = this.config.budget?.maxToolCalls;
    if (maxToolCalls !== undefined && this.taskCount >= maxToolCalls) {
      throw new Error(`Sub-agent ${this.config.name} exceeded max task budget`);
    }
  }
}

async function writeAgentLog(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${new Date().toISOString()} ${text}\n`, "utf8");
}
