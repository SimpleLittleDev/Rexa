import { fail, ok, type ToolResult } from "../common/result";
import { SubAgent, type LLMRouterLike, type SubAgentConfig, type SubAgentResult, type SubAgentTask } from "./subagent";

export class SubAgentManager {
  private readonly agents = new Map<string, SubAgent>();

  constructor(private readonly router: LLMRouterLike) {}

  async spawnAgent(config: SubAgentConfig): Promise<SubAgent> {
    const agent = new SubAgent(config, this.router);
    this.agents.set(agent.agentId, agent);
    return agent;
  }

  stopAgent(agentId: string): ToolResult<{ agentId: string }> {
    const agent = this.agents.get(agentId);
    if (!agent) return fail("SUBAGENT_NOT_FOUND", `Sub-agent '${agentId}' was not found`, { recoverable: true });
    agent.stop();
    this.agents.delete(agentId);
    return ok({ agentId });
  }

  async sendTask(agentId: string, task: SubAgentTask): Promise<SubAgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Sub-agent '${agentId}' was not found`);
    }
    return agent.run(task);
  }

  async collectResult(agentId: string, task: SubAgentTask): Promise<SubAgentResult> {
    return this.sendTask(agentId, task);
  }

  listActiveAgents(): Array<{ agentId: string; name: string; role: string; status: string }> {
    return [...this.agents.values()].map((agent) => ({
      agentId: agent.agentId,
      name: agent.config.name,
      role: agent.config.role,
      status: agent.status,
    }));
  }

  enforcePermission(agentId: string, tool: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    return agent.config.tools.includes(tool);
  }

  enforceBudget(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  killAgentOnTimeout(agentId: string): void {
    this.stopAgent(agentId);
  }
}
