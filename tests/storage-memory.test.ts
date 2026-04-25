import { describe, expect, test } from "vitest";
import { MemoryStorage } from "../src/storage/memory.storage";

describe("MemoryStorage", () => {
  test("stores, queries, and deletes collection records", async () => {
    const storage = new MemoryStorage();
    await storage.connect();
    await storage.set("tasks", "task_1", { id: "task_1", status: "running", owner: "local" });
    await storage.set("tasks", "task_2", { id: "task_2", status: "completed", owner: "local" });

    const running = await storage.query<{ id: string; status: string }>("tasks", {
      where: { status: "running" },
    });

    expect(running).toHaveLength(1);
    expect(running[0]?.id).toBe("task_1");

    await storage.delete("tasks", "task_1");
    expect(await storage.get("tasks", "task_1")).toBeNull();
  });
});
