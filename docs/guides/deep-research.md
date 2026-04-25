# Deep research

Rexa can run a multi-step research workflow: take a user question,
expand it into sub-queries, hit the web, dedupe + rank the sources,
fetch + extract the top results, and synthesise a grounded answer with
inline `[n]` citations.

## CLI

```bash
rexa research "kapan gunung api krakatau pertama meletus dan dampaknya?"
rexa research "compare bun vs deno performance 2025" --top-k 4 --lang en
```

Flags:

| Flag        | Description                                                |
|-------------|------------------------------------------------------------|
| `--max-sub` | Cap on sub-queries derived from the question.              |
| `--top-k`   | Number of sources to actually fetch + read.                |
| `--lang`    | `id` or `en`; controls the synthesis language.             |

## Search providers

Rexa picks the first available provider in this order:

1. **Tavily** — set `TAVILY_API_KEY`. Best signal-to-noise for research.
2. **Brave Search API** — set `BRAVE_SEARCH_API_KEY`.
3. **DuckDuckGo HTML** — always available, no key.

Add more providers by implementing `WebSearchProvider` in
`src/research/web-search.ts` and adding them to
`buildDefaultSearchProvider()`.

## Programmatic use

```ts
import { ResearchEngine } from "rexa/dist/src/research/research-engine.js";
import { LLMRouter } from "rexa/dist/src/llm/llm-router.js";

const router = new LLMRouter(/* providers */, /* config */);
const engine = new ResearchEngine({ router });
const result = await engine.run("question goes here", { fetchTopK: 6 });

console.log(result.answer);     // grounded answer with [n] citations
console.log(result.citations);  // [{ index, url, title }, ...]
console.log(result.sources);    // full ranked source list
```

## What it does NOT do

- It does not store research output to long-term memory by default —
  wire that yourself if you want persistent knowledge accumulation
  (this lands as part of the RAG ingest pipeline in Sprint 3).
- It does not bypass paywalls or login walls.
- It is not a replacement for human verification on sensitive topics
  (medical, legal, financial). The model is instructed to flag
  conflicting sources but still hallucinates occasionally.
