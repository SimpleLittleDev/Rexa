#!/usr/bin/env node
/**
 * Smoke-test long-term chat memory: orchestrator should persist user
 * + assistant turns under chat:{userId} scope and replay them on the
 * next turn.
 */
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const { Orchestrator } = require("../dist/src/agent/orchestrator.js");
const { LLMRouter } = require("../dist/src/llm/llm-router.js");
const { MemoryManager } = require("../dist/src/memory/memory-manager.js");
const { JsonStorage } = require("../dist/src/storage/json.storage.js");
const { defaultAppConfig } = require("../dist/src/app/config.js");

const tmp = mkdtempSync(join(tmpdir(), "rexa-chat-mem-"));
const storagePath = join(tmp, "store.json");

class CaptureProvider {
  constructor() {
    this.name = "capture";
    this.type = "local";
    this.lastInput = null;
  }
  async isAvailable() { return true; }
  async generate(input) {
    this.lastInput = input;
    return {
      id: "x",
      provider: this.name,
      model: input.model,
      text: "Halo, saya ingat percakapan sebelumnya.",
      usage: { inputTokens: 1, outputTokens: 1, costUsd: 0 },
      metadata: {},
    };
  }
  async *stream(input) { yield { textDelta: "x", done: true }; }
}

const provider = new CaptureProvider();
const router = new LLMRouter(
  { capture: provider },
  {
    roles: {
      main: { provider: "capture", model: "x" },
      coding: { provider: "capture", model: "x" },
      browser: { provider: "capture", model: "x" },
      research: { provider: "capture", model: "x" },
      cheap: { provider: "capture", model: "x" },
    },
    fallbackOrder: ["capture"],
  },
);

const storage = new JsonStorage(storagePath);
await storage.connect();
const memory = new MemoryManager(storage);
await memory.init();

const appConfig = defaultAppConfig();
const agentsConfig = { mainAgent: {}, subAgentTypes: [] };
const orchestrator = new Orchestrator(router, memory, agentsConfig, appConfig);

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ok ${name}`);
  } catch (error) {
    console.log(`  FAIL ${name}`);
    console.log(`    ${error.message}`);
    process.exitCode = 1;
  }
}

console.log("Orchestrator long-term chat memory");

await test("turn 1: user message persisted", async () => {
  await orchestrator.handle("Halo Rexa, namaku Dante.", { userId: "user-A" });
  const turns = await memory.recentTurns("chat:user-A", 10);
  const userTurns = turns.filter((t) => t.type === "user-turn");
  const assistantTurns = turns.filter((t) => t.type === "assistant-turn");
  assert.equal(userTurns.length, 1);
  assert.equal(assistantTurns.length, 1);
  assert.match(userTurns[0].text, /Dante/);
});

await test("turn 2: prior history is injected into the prompt", async () => {
  await orchestrator.handle("Apa nama saya?", { userId: "user-A" });
  const userPrompt = provider.lastInput.messages.find((m) => m.role === "user")?.content ?? "";
  // The recent-conversation block should be present and contain the prior user turn.
  assert.match(userPrompt, /Recent conversation/);
  assert.match(userPrompt, /User: Halo Rexa, namaku Dante\./);
  assert.match(userPrompt, /Rexa: Halo, saya ingat/);
});

await test("turn 3: turns persist across orchestrator instance (long-term)", async () => {
  // Build a fresh orchestrator pointing at the same storage.
  const storage2 = new JsonStorage(storagePath);
  await storage2.connect();
  const memory2 = new MemoryManager(storage2);
  await memory2.init();
  const orch2 = new Orchestrator(router, memory2, agentsConfig, appConfig);
  provider.lastInput = null;
  await orch2.handle("Lanjut ya.", { userId: "user-A" });
  const userPrompt = provider.lastInput.messages.find((m) => m.role === "user")?.content ?? "";
  assert.match(userPrompt, /User: Halo Rexa, namaku Dante\./);
});

await test("different user has isolated chat scope", async () => {
  provider.lastInput = null;
  await orchestrator.handle("Hi, saya user B baru.", { userId: "user-B" });
  const userPrompt = provider.lastInput.messages.find((m) => m.role === "user")?.content ?? "";
  // user-B's `Recent conversation` block must show 0 prior chat turns for that user.
  assert.match(userPrompt, /Recent conversation \(last 0 turns\)/);
});

rmSync(tmp, { recursive: true, force: true });

if (process.exitCode) {
  console.log("\nFAIL");
} else {
  console.log("\nOK");
}
