#!/usr/bin/env node
// Smoke tests for computer-use abstraction. The actual platform
// adapters (xdotool/screencapture/PowerShell/adb) are exercised
// indirectly via Manager.availableBackends(); we verify the high-level
// orchestration logic with a fake adapter.

import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";

const { ComputerUseManager } = await import("../dist/src/computer-use/computer-use-manager.js");
const { NoneComputerUseAdapter } = await import("../dist/src/computer-use/none.adapter.js");
const { buildComputerUseTools } = await import("../dist/src/computer-use/computer-use-tools.js");

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

const screenshotDir = mkdtempSync(join(tmpdir(), "rexa-cu-"));

await test("availableBackends always includes 'none'", async () => {
  const manager = new ComputerUseManager({
    enabled: true,
    backend: "auto",
    screenshotDir,
  });
  const backends = await manager.availableBackends();
  assert.ok(backends.includes("none"));
});

await test("disabled config resolves to NoneComputerUseAdapter", async () => {
  const manager = new ComputerUseManager({
    enabled: false,
    backend: "auto",
    screenshotDir,
  });
  const adapter = await manager.adapter();
  assert.equal(adapter.name, "none");
});

await test("explicit backend=none resolves directly", async () => {
  const manager = new ComputerUseManager({
    enabled: true,
    backend: "none",
    screenshotDir,
  });
  const adapter = await manager.adapter();
  assert.equal(adapter.name, "none");
});

await test("NoneAdapter throws structured error on screenshot", async () => {
  const adapter = new NoneComputerUseAdapter();
  await assert.rejects(adapter.screenshot(), /no backend available/);
});

await test("NoneAdapter throws on click/type/key/scroll/move", async () => {
  const adapter = new NoneComputerUseAdapter();
  await assert.rejects(adapter.click(0, 0), /no backend available/);
  await assert.rejects(adapter.type("x"), /no backend available/);
  await assert.rejects(adapter.key("Return"), /no backend available/);
  await assert.rejects(adapter.scroll(0, 0, "up"), /no backend available/);
  await assert.rejects(adapter.moveMouse(0, 0), /no backend available/);
});

await test("buildComputerUseTools exposes 6 tools with namespaced names", async () => {
  const manager = new ComputerUseManager({
    enabled: false,
    backend: "auto",
    screenshotDir,
  });
  const tools = buildComputerUseTools(manager);
  assert.equal(tools.length, 6);
  const names = tools.map((t) => t.definition.name).sort();
  assert.deepEqual(names, ["os.click", "os.key", "os.move", "os.scroll", "os.screenshot", "os.type"].sort());
});

await test("os.click validates required args", async () => {
  const manager = new ComputerUseManager({
    enabled: false,
    backend: "none",
    screenshotDir,
  });
  const tools = buildComputerUseTools(manager);
  const click = tools.find((t) => t.definition.name === "os.click");
  // Missing both x and y → should return error structure rather than
  // throwing.
  const result = await click.execute({}, {});
  assert.ok(result.error, "expected structured error for missing coords");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
