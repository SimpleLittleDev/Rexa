#!/usr/bin/env node
// Smoke test: SandboxManager with the auto-selected backend on this
// host. We validate the manager picks *something* (bubblewrap on Linux
// CI normally), runs `echo` and `false`, and enforces a wall-clock
// timeout via `sleep`.
import { strict as assert } from "node:assert";
const { SandboxManager } = await import("../dist/src/security/sandbox/index.js");

const baseConfig = {
  enabled: true,
  backend: "auto",
  defaultTimeoutMs: 5_000,
  memoryLimitMb: 512,
  cpuLimit: 1,
  allowNetwork: false,
  writablePaths: [],
};

let pass = 0;
let fail = 0;
async function test(name, fn) {
  try { await fn(); console.log("✔", name); pass++; }
  catch (error) { console.error("✘", name, "—", error.message); fail++; }
}

await test("availableBackends includes 'none' as fallback", async () => {
  const manager = new SandboxManager(baseConfig);
  const available = await manager.availableBackends();
  assert.ok(available.includes("none"));
});

await test("run echo via auto backend", async () => {
  const manager = new SandboxManager(baseConfig);
  const result = await manager.run("sh", ["-lc", "echo hello"], { timeoutMs: 3_000 });
  assert.equal(result.exitCode, 0, `expected exit 0, got ${result.exitCode} (backend=${result.backend}, stderr=${result.stderr})`);
  assert.match(result.stdout, /hello/);
  assert.equal(result.timedOut, false);
});

await test("non-zero exit propagates", async () => {
  const manager = new SandboxManager(baseConfig);
  const result = await manager.run("sh", ["-lc", "exit 7"], { timeoutMs: 3_000 });
  assert.equal(result.exitCode, 7, `backend=${result.backend}`);
});

await test("timeout produces timedOut=true", async () => {
  const manager = new SandboxManager(baseConfig);
  const result = await manager.run("sh", ["-lc", "sleep 5"], { timeoutMs: 500 });
  assert.equal(result.timedOut, true, `backend=${result.backend}`);
});

await test("disabled config falls back to 'none' backend", async () => {
  const manager = new SandboxManager({ ...baseConfig, enabled: false });
  const result = await manager.run("sh", ["-lc", "echo disabled"], { timeoutMs: 3_000 });
  assert.equal(result.backend, "none");
  assert.match(result.stdout, /disabled/);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
