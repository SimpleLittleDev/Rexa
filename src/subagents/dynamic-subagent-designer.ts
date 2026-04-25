import type { AgentsConfig } from "../app/config";
import type { LLMRouterLike, SubAgentConfig } from "./subagent";

export interface DynamicSubAgentDesignInput {
  userMessage: string;
  memoryContext: string;
  plannerSteps: string[];
}

export interface DynamicSubAgentProposal extends SubAgentConfig {
  task: string;
}

interface RawSubAgentDesign {
  shouldSpawn?: boolean;
  agents?: Array<{
    name?: string;
    role?: string;
    model?: string;
    tools?: string[];
    systemPrompt?: string;
    task?: string;
    memoryScope?: string;
  }>;
}

export class DynamicSubAgentDesigner {
  constructor(
    private readonly router: LLMRouterLike,
    private readonly agentsConfig: AgentsConfig,
  ) {}

  async design(input: DynamicSubAgentDesignInput): Promise<DynamicSubAgentProposal[]> {
    const policy = this.agentsConfig.subAgentPolicy;
    if (!policy.enabled) return [];

    const main = this.agentsConfig.mainAgent;
    const response = await this.tryDesignWithMainProvider(input);
    if (!response) return [];

    const design = parseSubAgentDesign(response.text);
    if (!design.shouldSpawn || !Array.isArray(design.agents)) return [];

    return design.agents
      .slice(0, policy.maxAgents)
      .map((agent, index): DynamicSubAgentProposal | null => {
        const name = cleanText(agent.name) || `Worker${index + 1}`;
        const role = cleanText(agent.role) || "runtime-worker";
        const model = cleanText(agent.model) || main.model;
        const systemPrompt = cleanText(agent.systemPrompt);
        const task = cleanText(agent.task);
        if (!systemPrompt || !task) return null;

        return {
          name,
          role,
          provider: policy.sameProviderAsMain ? main.provider : main.provider,
          model,
          tools: sanitizeTools(agent.tools, policy.allowedTools),
          memoryScope: agent.memoryScope ?? policy.defaultMemoryScope,
          systemPrompt,
          budget: policy.defaultBudget,
          task,
        };
      })
      .filter((agent): agent is DynamicSubAgentProposal => Boolean(agent));
  }

  private async tryDesignWithMainProvider(input: DynamicSubAgentDesignInput) {
    const policy = this.agentsConfig.subAgentPolicy;
    const main = this.agentsConfig.mainAgent;
    try {
      return await this.router.generateForProvider(
        { provider: main.provider, model: main.model },
        {
          messages: [
            {
              role: "system",
              content: [
                "You are Rexa main agent. Your job is to design runtime sub-agents only when useful.",
                "Return JSON only. Do not use markdown.",
                "Sub-agents are dynamic workers. Do not use preset names or preset roles.",
                "You decide each worker name, role, model, systemPrompt, allowed tools, and task.",
                "Worker provider will be forced to the same provider as the main agent by Rexa runtime.",
                `Allowed tools: ${policy.allowedTools.join(", ")}`,
                `Max agents: ${policy.maxAgents}`,
                'Schema: {"shouldSpawn": boolean, "agents": [{"name": string, "role": string, "model": string, "tools": string[], "systemPrompt": string, "task": string}]}',
              ].join("\n"),
            },
            {
              role: "user",
              content: [
                `User request: ${input.userMessage}`,
                `Relevant memory: ${input.memoryContext || "none"}`,
                `Planner steps: ${input.plannerSteps.join(" -> ") || "none"}`,
              ].join("\n\n"),
            },
          ],
        },
      );
    } catch {
      return null;
    }
  }
}

export function parseSubAgentDesign(text: string): RawSubAgentDesign {
  const json = extractJson(text);
  if (!json) return { shouldSpawn: false, agents: [] };
  try {
    return JSON.parse(json) as RawSubAgentDesign;
  } catch {
    return { shouldSpawn: false, agents: [] };
  }
}

function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

function sanitizeTools(input: string[] | undefined, allowedTools: string[]): string[] {
  const allowed = new Set(allowedTools);
  const tools = (input ?? []).filter((tool) => allowed.has(tool));
  return tools.length > 0 ? [...new Set(tools)] : [];
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
