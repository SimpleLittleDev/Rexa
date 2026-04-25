import { logger } from "../logs/logger";
import type { ResearchSource } from "./research-types";

export interface WebSearchProvider {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string, options?: { limit?: number }): Promise<ResearchSource[]>;
}

/** Tavily — deep-research-friendly, returns clean snippets + content previews. */
export class TavilySearchProvider implements WebSearchProvider {
  readonly name = "tavily";
  constructor(private readonly apiKey = process.env.TAVILY_API_KEY ?? "") {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async search(query: string, options: { limit?: number } = {}): Promise<ResearchSource[]> {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        search_depth: "basic",
        max_results: options.limit ?? 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });
    if (!response.ok) {
      logger.warn("[research] tavily failed", { status: response.status });
      return [];
    }
    const data = (await response.json()) as { results?: Array<{ url: string; title: string; content: string; published_date?: string; score?: number }> };
    return (data.results ?? []).map((r) => ({
      url: r.url,
      title: r.title || r.url,
      snippet: r.content || "",
      engine: this.name,
      publishedAt: r.published_date,
      fromQuery: query,
      score: typeof r.score === "number" ? r.score : 0.5,
    }));
  }
}

/** Brave Web Search API — keyed but generous free tier. */
export class BraveSearchProvider implements WebSearchProvider {
  readonly name = "brave";
  constructor(private readonly apiKey = process.env.BRAVE_SEARCH_API_KEY ?? "") {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async search(query: string, options: { limit?: number } = {}): Promise<ResearchSource[]> {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(options.limit ?? 5));
    const response = await fetch(url, {
      headers: { "X-Subscription-Token": this.apiKey, accept: "application/json" },
    });
    if (!response.ok) {
      logger.warn("[research] brave failed", { status: response.status });
      return [];
    }
    const data = (await response.json()) as {
      web?: { results?: Array<{ url: string; title: string; description: string; age?: string }> };
    };
    return (data.web?.results ?? []).map((r) => ({
      url: r.url,
      title: r.title || r.url,
      snippet: stripHtml(r.description ?? ""),
      engine: this.name,
      publishedAt: r.age,
      fromQuery: query,
      score: 0.5,
    }));
  }
}

/**
 * Free DuckDuckGo HTML fallback. Scrapes the lite UI – no API key, but
 * fragile if DDG changes markup. Always available.
 */
export class DuckDuckGoHtmlProvider implements WebSearchProvider {
  readonly name = "duckduckgo";
  isAvailable(): boolean {
    return true;
  }

  async search(query: string, options: { limit?: number } = {}): Promise<ResearchSource[]> {
    const url = new URL("https://duckduckgo.com/html/");
    url.searchParams.set("q", query);
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
    });
    if (!response.ok) {
      logger.warn("[research] duckduckgo failed", { status: response.status });
      return [];
    }
    const html = await response.text();
    const limit = options.limit ?? 5;
    const out: ResearchSource[] = [];
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null && out.length < limit) {
      const url = decodeDdgRedirect(match[1]);
      out.push({
        url,
        title: stripHtml(match[2]).trim(),
        snippet: stripHtml(match[3]).trim(),
        engine: this.name,
        fromQuery: query,
        score: 0.4,
      });
    }
    return out;
  }
}

/**
 * Composite that runs available providers in priority order, falls
 * through to the next when the first returns nothing/errors.
 */
export class CompositeSearch implements WebSearchProvider {
  readonly name = "composite";
  constructor(private readonly providers: WebSearchProvider[]) {}

  isAvailable(): boolean {
    return this.providers.some((p) => p.isAvailable());
  }

  async search(query: string, options: { limit?: number } = {}): Promise<ResearchSource[]> {
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      try {
        const results = await provider.search(query, options);
        if (results.length > 0) return results;
      } catch (error) {
        logger.warn("[research] search provider failed", {
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return [];
  }
}

export function buildDefaultSearchProvider(): WebSearchProvider {
  // Order: paid/keyed providers first because they tend to return cleaner
  // results, then DuckDuckGo as the free fallback so research never
  // hard-fails just because the user has no search key configured.
  const providers: WebSearchProvider[] = [];
  const tavily = new TavilySearchProvider();
  if (tavily.isAvailable()) providers.push(tavily);
  const brave = new BraveSearchProvider();
  if (brave.isAvailable()) providers.push(brave);
  providers.push(new DuckDuckGoHtmlProvider());
  return new CompositeSearch(providers);
}

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 RexaResearch";

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function decodeDdgRedirect(href: string): string {
  // DDG wraps results in /l/?uddg=<encoded> — unwrap when present.
  if (href.startsWith("//duckduckgo.com/l/?")) {
    try {
      const url = new URL("https:" + href);
      const target = url.searchParams.get("uddg");
      if (target) return decodeURIComponent(target);
    } catch {
      // fall through
    }
  }
  if (href.startsWith("//")) return "https:" + href;
  return href;
}
