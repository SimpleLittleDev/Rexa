#!/usr/bin/env node
// Smoke tests for the deep-research engine. We run with a stub search
// provider + stub LLM router so the test is fully offline and
// deterministic.

import assert from "node:assert/strict";

const { ResearchEngine } = await import("../dist/src/research/research-engine.js");
const { extractReadableText } = await import("../dist/src/research/web-fetcher.js");

let pass = 0;
let fail = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log("✔ " + name);
    pass++;
  } catch (error) {
    console.log("✘ " + name);
    console.log("   " + (error && error.message ? error.message : String(error)));
    fail++;
  }
}

class StubSearch {
  constructor(byQuery) {
    this.name = "stub";
    this.byQuery = byQuery;
  }
  isAvailable() {
    return true;
  }
  async search(query) {
    const list = this.byQuery[query] ?? this.byQuery["*"] ?? [];
    return list.map((item, i) => ({
      url: item.url,
      title: item.title,
      snippet: item.snippet,
      engine: this.name,
      fromQuery: query,
      score: 1 - i * 0.1,
    }));
  }
}

class StubRouter {
  constructor(replies) {
    this.replies = replies;
    this.calls = [];
  }
  async generateForRole(role, request) {
    this.calls.push({ role, request });
    const last = request.messages[request.messages.length - 1].content ?? "";
    for (const [needle, reply] of Object.entries(this.replies)) {
      if (typeof last === "string" && last.includes(needle)) {
        return { text: reply, provider: "stub", model: "stub", costUsd: 0 };
      }
    }
    return { text: this.replies.__default ?? "(no answer)", provider: "stub", model: "stub", costUsd: 0 };
  }
}

await test("ResearchEngine returns sources + answer with router + stub search", async () => {
  const search = new StubSearch({
    "what is rexa": [
      { url: "https://example.com/rexa", title: "Rexa", snippet: "Rexa is a personal AI agent." },
    ],
    "rexa features": [
      { url: "https://example.com/rexa-features", title: "Features", snippet: "Rexa supports browser, terminal, daemon." },
    ],
  });
  const router = new StubRouter({
    "Question:": "Rexa adalah AI agent personal [1] dengan fitur browser, terminal, dan daemon [2].",
    "Question": '["what is rexa", "rexa features"]',
  });
  const engine = new ResearchEngine({ router, search });
  const result = await engine.run("Apa itu Rexa dan fitur-fiturnya?", { fetchTopK: 0 });
  // fetchTopK=0 to skip network fetches; we only verify pipeline shape
  assert.ok(result.subQueries.length >= 1);
  assert.ok(result.answer.length > 0);
});

await test("Engine degrades gracefully without router", async () => {
  const search = new StubSearch({
    "*": [{ url: "https://example.com/x", title: "Example", snippet: "snippet" }],
  });
  const engine = new ResearchEngine({ router: null, search });
  const result = await engine.run("test question", { fetchTopK: 0 });
  assert.equal(result.subQueries.length, 1, "no router → single sub-query");
  assert.ok(result.answer.includes("[1]"));
  assert.ok(result.citations.length === 1);
});

await test("Engine dedupes URLs surfaced by multiple sub-queries", async () => {
  const search = new StubSearch({
    "*": [{ url: "https://example.com/dup?utm_source=x", title: "Dup", snippet: "" }],
  });
  const router = new StubRouter({
    Question: '["a", "b", "c"]',
    "Question:": "answer",
  });
  const engine = new ResearchEngine({ router, search });
  const result = await engine.run("dup test", { fetchTopK: 0 });
  // 3 sub-queries, all return same URL → must collapse to 1 unique
  assert.equal(result.sources.length, 1);
});

await test("extractReadableText strips boilerplate and pulls article", async () => {
  const html = `<html><head><title>Hi</title></head><body>
<nav>menu</nav>
<header>banner</header>
<article><h1>Hello</h1><p>World</p></article>
<footer>fine print</footer>
<script>tracker()</script>
</body></html>`;
  const out = extractReadableText(html);
  assert.equal(out.title, "Hi");
  assert.match(out.text, /Hello/);
  assert.match(out.text, /World/);
  assert.doesNotMatch(out.text, /banner/);
  assert.doesNotMatch(out.text, /menu/);
  assert.doesNotMatch(out.text, /tracker/);
});

await test("CompositeSearch falls through when first provider returns []", async () => {
  const { CompositeSearch } = await import("../dist/src/research/web-search.js");
  const empty = { name: "empty", isAvailable: () => true, async search() { return []; } };
  const filled = {
    name: "filled",
    isAvailable: () => true,
    async search(q) {
      return [
        { url: "https://example.com/a", title: "A", snippet: "", engine: "filled", fromQuery: q, score: 0.5 },
      ];
    },
  };
  const composite = new CompositeSearch([empty, filled]);
  const r = await composite.search("anything");
  assert.equal(r.length, 1);
  assert.equal(r[0].engine, "filled");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
