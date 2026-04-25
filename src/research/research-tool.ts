import type { ToolHandler } from "../tools/tool-dispatcher";
import { ResearchEngine, type ResearchEngineDependencies } from "./research-engine";
import type { ResearchOptions } from "./research-types";

export interface ResearchToolDeps extends ResearchEngineDependencies {
  defaultOptions?: ResearchOptions;
}

/**
 * Wraps the deep-research engine as a ToolHandler so it can be exposed
 * to the LLM tool-loop the same way every other Rexa tool is.
 */
export function buildResearchTools(deps: ResearchToolDeps = {}): ToolHandler[] {
  const engine = new ResearchEngine(deps);
  return [
    {
      definition: {
        name: "research.deep",
        description:
          "Run a multi-step web research workflow: expand the question into sub-queries, search the web, fetch the top sources, and produce a grounded answer with [n] citations.",
        parameters: {
          type: "object",
          required: ["question"],
          properties: {
            question: { type: "string", description: "User question to research." },
            maxSubQueries: { type: "integer", minimum: 1, maximum: 8 },
            resultsPerQuery: { type: "integer", minimum: 1, maximum: 10 },
            fetchTopK: { type: "integer", minimum: 1, maximum: 12 },
            language: { type: "string", enum: ["id", "en"] },
          },
        },
      },
      execute: async (args) => {
        const question = String(args.question ?? "").trim();
        if (!question) return { error: "question is required" };
        const result = await engine.run(question, {
          ...deps.defaultOptions,
          maxSubQueries: numberOr(args.maxSubQueries, deps.defaultOptions?.maxSubQueries),
          resultsPerQuery: numberOr(args.resultsPerQuery, deps.defaultOptions?.resultsPerQuery),
          fetchTopK: numberOr(args.fetchTopK, deps.defaultOptions?.fetchTopK),
          language: (args.language as "id" | "en" | undefined) ?? deps.defaultOptions?.language,
        });
        return result;
      },
    },
  ];
}

function numberOr(value: unknown, fallback: number | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}
