import { logger } from "../logs/logger";
import type { LLMRouter } from "../llm/llm-router";
import { fetchAndExtract } from "./web-fetcher";
import { buildDefaultSearchProvider, type WebSearchProvider } from "./web-search";
import type { Citation, ResearchOptions, ResearchResult, ResearchSource } from "./research-types";

export interface ResearchEngineDependencies {
  router?: LLMRouter | null;
  search?: WebSearchProvider;
}

/**
 * Multi-step web research engine.
 *
 *   question
 *     → expand into 2-4 sub-queries (LLM, optional)
 *     → run each sub-query through the search provider
 *     → dedupe + rank by combined relevance/recency
 *     → fetch + extract main text for the top-K
 *     → ask the LLM to synthesise a grounded answer with [n] citations
 *
 * Designed to degrade gracefully:
 *   - no LLM router → skip query expansion + skip synthesis (returns
 *     ranked sources only).
 *   - no API search keys → DuckDuckGo HTML fallback runs anyway.
 */
export class ResearchEngine {
  private readonly search: WebSearchProvider;

  constructor(private readonly deps: ResearchEngineDependencies = {}) {
    this.search = deps.search ?? buildDefaultSearchProvider();
  }

  async run(question: string, options: ResearchOptions = {}): Promise<ResearchResult> {
    const started = Date.now();
    const subQueries = await this.expandQueries(question, options);
    const rawSources: ResearchSource[] = [];
    const perQuery = options.resultsPerQuery ?? 5;
    for (const query of subQueries) {
      try {
        const found = await this.search.search(query, { limit: perQuery });
        for (const item of found) rawSources.push(item);
      } catch (error) {
        logger.warn("[research] sub-query search failed", {
          query,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const ranked = rankAndDedupe(rawSources);
    const fetchTopK = Math.min(ranked.length, options.fetchTopK ?? 6);
    const enriched = await Promise.all(
      ranked.slice(0, fetchTopK).map(async (source) => {
        const page = await fetchAndExtract(source.url);
        if (page) {
          source.body = page.text.slice(0, 12_000);
          if (!source.title && page.title) source.title = page.title;
        }
        return source;
      }),
    );
    const sources = enriched.concat(ranked.slice(fetchTopK));
    // Synthesise against the top sources we know about — when the user
    // sets fetchTopK to 0 we still want to cite the snippet-only
    // results that surfaced from search. Cap at 8 to keep the prompt
    // bounded.
    const synthesisSources = sources.slice(0, Math.max(fetchTopK, Math.min(sources.length, 8)));
    const { answer, citations } = await this.synthesise(question, synthesisSources, options);

    return {
      question,
      subQueries,
      sources,
      answer,
      citations,
      durationMs: Date.now() - started,
    };
  }

  private async expandQueries(question: string, options: ResearchOptions): Promise<string[]> {
    const max = Math.max(1, options.maxSubQueries ?? 4);
    if (max === 1 || !this.deps.router) return [question.trim()];
    const role = options.role ?? "research";
    try {
      const response = await this.deps.router.generateForRole(role, {
        messages: [
          {
            role: "system",
            content: [
              "You are a research planner.",
              "Given a user question, output a JSON array of 2 to N self-contained web-search queries that together would gather enough evidence to answer it.",
              "Prefer queries that are specific, dateful when relevant, and diverse (different angles).",
              "No commentary — output ONLY the JSON array.",
            ].join(" "),
          },
          { role: "user", content: `N=${max}\nQuestion: ${question}` },
        ],
      });
      const parsed = parseJsonArray(response.text);
      if (parsed && parsed.length > 0) return parsed.slice(0, max);
    } catch (error) {
      logger.warn("[research] query expansion failed, falling back to single query", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return [question.trim()];
  }

  private async synthesise(
    question: string,
    sources: ResearchSource[],
    options: ResearchOptions,
  ): Promise<{ answer: string; citations: Citation[] }> {
    const citations: Citation[] = sources.map((source, index) => ({
      index: index + 1,
      url: source.url,
      title: source.title || source.url,
    }));

    if (sources.length === 0) {
      return {
        answer: options.language === "id"
          ? "Belum menemukan sumber yang relevan."
          : "No relevant sources were found.",
        citations: [],
      };
    }

    if (!this.deps.router) {
      // Without an LLM, just hand back a structured digest.
      const digest = sources
        .map((s, i) => `[${i + 1}] ${s.title} — ${s.url}\n${(s.snippet || "").slice(0, 280)}`)
        .join("\n\n");
      return { answer: digest, citations };
    }

    const role = options.role ?? "research";
    const language = options.language ?? "id";
    const sourcesBlock = sources
      .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${(s.body || s.snippet || "").slice(0, 2400)}`)
      .join("\n\n---\n\n");
    const response = await this.deps.router.generateForRole(role, {
      messages: [
        {
          role: "system",
          content: [
            "You are Rexa's research synthesiser.",
            "Read the numbered sources and answer the user's question with grounded, factual prose.",
            "Cite every non-trivial claim using inline [n] references that match the source numbers.",
            "If the sources disagree, say so. If the sources don't answer the question, say so explicitly.",
            "Never invent URLs or numbers that aren't in the source list.",
            language === "id"
              ? "Respond in Bahasa Indonesia."
              : "Respond in English.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Question: ${question}\n\nSources:\n${sourcesBlock}`,
        },
      ],
    });

    return { answer: response.text.trim(), citations };
  }
}

function rankAndDedupe(sources: ResearchSource[]): ResearchSource[] {
  const seen = new Map<string, ResearchSource>();
  for (const source of sources) {
    const key = canonicalUrl(source.url);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, source);
      continue;
    }
    // Keep the higher-scoring entry; merge engine attribution so we know
    // the URL was surfaced by multiple providers.
    if (source.score > existing.score) {
      seen.set(key, { ...source, engine: `${existing.engine}+${source.engine}` });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}

function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // Drop common tracking params.
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "ref_src"]) {
      u.searchParams.delete(k);
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function parseJsonArray(text: string): string[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[0]) as unknown;
    if (Array.isArray(data)) {
      return data.map((item) => String(item)).filter((s) => s.length > 0);
    }
  } catch {
    // ignore
  }
  return null;
}
