import { describe, expect, test } from "vitest";
import { MemoryManager } from "../src/memory/memory-manager";
import { MemoryStorage } from "../src/storage/memory.storage";

describe("MemoryManager", () => {
  test("retrieves memories by relevance, recency, and importance", async () => {
    const storage = new MemoryStorage();
    const memory = new MemoryManager(storage);
    await memory.init();
    await memory.remember({
      scope: "global",
      type: "preference",
      text: "User prefers Codex CLI for coding tasks",
      importance: 0.9,
      tags: ["codex", "coding"],
    });
    await memory.remember({
      scope: "global",
      type: "tool",
      text: "Telegram bot token must never be logged",
      importance: 0.4,
      tags: ["telegram", "security"],
    });

    const results = await memory.retrieve("coding with codex", { limit: 1 });

    expect(results[0]?.text).toContain("Codex CLI");
  });
});
