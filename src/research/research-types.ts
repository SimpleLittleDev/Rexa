export interface ResearchSource {
  /** Original URL of the source. */
  url: string;
  title: string;
  /** Short snippet returned by the search engine (or first chunk of body). */
  snippet: string;
  /** Full extracted text after fetch+readability, when available. */
  body?: string;
  /** Search engine that surfaced this URL. */
  engine: string;
  /** Optional published date in ISO format. */
  publishedAt?: string;
  /** Sub-query that surfaced this URL (for trace/debugging). */
  fromQuery: string;
  /** Combined relevance/recency/credibility score in [0, 1]. */
  score: number;
}

export interface ResearchOptions {
  /** Hard cap on number of sub-queries to derive. Default 4. */
  maxSubQueries?: number;
  /** How many search results per sub-query to consider. Default 5. */
  resultsPerQuery?: number;
  /** How many top sources to actually fetch + extract text for. Default 6. */
  fetchTopK?: number;
  /** Maximum total seconds for the entire pipeline. Default 60. */
  timeoutMs?: number;
  /** Preferred LLM role for synthesis. Default "research". */
  role?: string;
  /** Language hint (id/en) propagated to the LLM. */
  language?: "id" | "en";
}

export interface ResearchResult {
  /** Original user question. */
  question: string;
  /** Sub-queries derived from the question. */
  subQueries: string[];
  /** All ranked, deduped sources considered. */
  sources: ResearchSource[];
  /** Final grounded answer with inline citations [n]. */
  answer: string;
  /** Citation map (1-based index → source). */
  citations: Citation[];
  /** Wall-clock duration in ms. */
  durationMs: number;
}

export interface Citation {
  index: number;
  url: string;
  title: string;
}
