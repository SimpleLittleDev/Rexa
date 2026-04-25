import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { FileTool } from "../src/tools/file/file.tool";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "rexa-file-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("FileTool", () => {
  test("blocks path traversal outside workspace root", async () => {
    const tool = new FileTool({ rootDir: root });

    const result = await tool.read("../outside.txt");

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("PATH_OUTSIDE_ROOT");
  });

  test("writes and reads safe relative files", async () => {
    const tool = new FileTool({ rootDir: root });

    await tool.write("notes/a.txt", "hello", { confirmed: true });
    const result = await tool.read("notes/a.txt");

    expect(result.success).toBe(true);
    expect(result.data?.content).toBe("hello");
  });
});
