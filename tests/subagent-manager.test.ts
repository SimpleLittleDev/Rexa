import { describe, expect, test } from "vitest";
import { SubAgentManager } from "../src/subagents/subagent-manager";
import type { LLMRouterLike } from "../src/subagents/subagent";

describe("SubAgentManager", () => {
  test("spawns an isolated sub-agent and returns a valid output contract", async () => {
    const router: LLMRouterLike = {
      generateForProvider: async ({ provider, model }, request) => ({
        id: "response_1",
        provider,
        model,
        text: `handled: ${request.messages.at(-1)?.content}`,
        usage: { inputTokens: 1, outputTokens: 2, costUsd: 0 },
        metadata: {},
      }),
    };
    const manager = new SubAgentManager(router);

    const agent = await manager.spawnAgent({
      name: "RuntimeCoder",
      role: "runtime-coding-worker",
      provider: "codex-cli",
      model: "configured-coding-model",
      tools: ["terminal", "file"],
      memoryScope: "task-only",
      budget: { maxToolCalls: 3, maxExecutionTimeMs: 10_000, maxCostUsd: 0.1 },
    });

    const result = await manager.sendTask(agent.agentId, {
      taskId: "task_001",
      input: "analyze project",
    });

    expect(result).toMatchObject({
      agentId: agent.agentId,
      name: "RuntimeCoder",
      role: "runtime-coding-worker",
      provider: "codex-cli",
      model: "configured-coding-model",
      taskId: "task_001",
      status: "completed",
      needsUserConfirmation: false,
    });
  });
});
