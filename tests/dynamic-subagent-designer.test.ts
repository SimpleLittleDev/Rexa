import { describe, expect, test } from "vitest";
import { DynamicSubAgentDesigner } from "../src/subagents/dynamic-subagent-designer";
import type { AgentsConfig } from "../src/app/config";
import type { LLMRouterLike } from "../src/subagents/subagent";

const agentsConfig: AgentsConfig = {
  mainAgent: {
    name: "Rexa",
    role: "main-orchestrator",
    provider: "codex-cli",
    model: "gpt-5.5",
    tools: ["browser", "terminal", "file", "memory", "subagent"],
    memoryScope: "global",
    budget: { maxToolCalls: 30, maxExecutionTimeMs: 600_000, maxCostUsd: 1 },
  },
  subAgentPolicy: {
    enabled: true,
    sameProviderAsMain: true,
    maxAgents: 2,
    allowedTools: ["browser", "terminal", "file", "memory"],
    defaultMemoryScope: "task-only",
    defaultBudget: { maxToolCalls: 10, maxExecutionTimeMs: 300_000, maxCostUsd: 0.5 },
  },
};

describe("DynamicSubAgentDesigner", () => {
  test("uses main agent output for worker name, role, model, task, and prompt", async () => {
    const router: LLMRouterLike = {
      generateForProvider: async (selection, request) => {
        expect(selection).toEqual({ provider: "codex-cli", model: "gpt-5.5" });
        expect(request.messages[0]?.content).toContain("design runtime sub-agents");
        return {
          id: "llm_1",
          provider: selection.provider,
          model: selection.model,
          text: JSON.stringify({
            shouldSpawn: true,
            agents: [
              {
                name: "CrawlerOne",
                role: "website-data-worker",
                model: "gpt-5.4",
                tools: ["browser", "terminal", "gmail.send"],
                systemPrompt: "You collect website data and return structured findings.",
                task: "Open the website, extract data, and summarize it for Rexa.",
              },
            ],
          }),
          usage: { inputTokens: 1, outputTokens: 1, costUsd: 0 },
          metadata: {},
        };
      },
    };

    const designer = new DynamicSubAgentDesigner(router, agentsConfig);
    const proposals = await designer.design({
      userMessage: "ambil data website sekalian coding",
      memoryContext: "none",
      plannerSteps: ["inspect", "delegate"],
    });

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      name: "CrawlerOne",
      role: "website-data-worker",
      provider: "codex-cli",
      model: "gpt-5.4",
      systemPrompt: "You collect website data and return structured findings.",
      task: "Open the website, extract data, and summarize it for Rexa.",
      tools: ["browser", "terminal"],
      memoryScope: "task-only",
      budget: agentsConfig.subAgentPolicy.defaultBudget,
    });
  });

  test("returns no workers when main agent says no spawn is needed", async () => {
    const router: LLMRouterLike = {
      generateForProvider: async (selection) => ({
        id: "llm_2",
        provider: selection.provider,
        model: selection.model,
        text: JSON.stringify({ shouldSpawn: false, agents: [] }),
        usage: { inputTokens: 1, outputTokens: 1, costUsd: 0 },
        metadata: {},
      }),
    };

    const designer = new DynamicSubAgentDesigner(router, agentsConfig);

    await expect(
      designer.design({
        userMessage: "hai",
        memoryContext: "",
        plannerSteps: [],
      }),
    ).resolves.toEqual([]);
  });

  test("returns no workers instead of crashing when main provider cannot design workers", async () => {
    const router: LLMRouterLike = {
      generateForProvider: async () => {
        throw new Error("Provider 'codex-cli' is not available");
      },
    };

    const designer = new DynamicSubAgentDesigner(router, agentsConfig);

    await expect(
      designer.design({
        userMessage: "complex task",
        memoryContext: "",
        plannerSteps: ["delegate"],
      }),
    ).resolves.toEqual([]);
  });
});
