#!/usr/bin/env node
// Smoke test: code search (ripgrep), patch parser, patch validator.
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const { CodeSearch } = await import("../dist/src/code/code-search.js");
const { parseUnifiedDiff, validatePatch } = await import("../dist/src/code/patch.js");

const repoDir = mkdtempSync(join(tmpdir(), "rexa-code-"));
mkdirSync(join(repoDir, "src"), { recursive: true });
writeFileSync(join(repoDir, "src", "alpha.ts"), `export function greet(name: string) {\n  return \`hello \${name}\`;\n}\n\nexport const planet = "earth";\n`);
writeFileSync(join(repoDir, "src", "beta.ts"), `import { greet } from "./alpha";\n\ngreet("world");\n`);
execFileSync("git", ["init", "-q", "-b", "main"], { cwd: repoDir });
execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoDir });
execFileSync("git", ["config", "user.name", "test"], { cwd: repoDir });
execFileSync("git", ["add", "."], { cwd: repoDir });
execFileSync("git", ["commit", "-q", "-m", "init"], { cwd: repoDir });

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); console.log("✔", name); pass++; }
  catch (error) { console.error("✘", name, "—", error.message); fail++; }
}

await test("CodeSearch.searchPattern finds matches", async () => {
  const search = new CodeSearch(repoDir);
  const matches = await search.searchPattern("greet", { glob: "**/*.ts" });
  assert.ok(matches.length >= 2);
  assert.ok(matches.some((m) => m.path.endsWith("alpha.ts")));
});

await test("CodeSearch.findDefinition for function", async () => {
  const search = new CodeSearch(repoDir);
  const matches = await search.findDefinition("greet", "typescript");
  assert.ok(matches.length >= 1);
  assert.ok(matches[0].path.endsWith("alpha.ts"));
});

await test("CodeSearch.findReferences finds all sites", async () => {
  const search = new CodeSearch(repoDir);
  const matches = await search.findReferences("greet", "typescript");
  assert.ok(matches.length >= 2);
});

await test("parseUnifiedDiff handles a simple patch", async () => {
  const diff = `diff --git a/src/alpha.ts b/src/alpha.ts\n--- a/src/alpha.ts\n+++ b/src/alpha.ts\n@@ -1,3 +1,3 @@\n-export function greet(name: string) {\n+export function greet(name: string): string {\n   return \`hello \${name}\`;\n }\n`;
  const files = parseUnifiedDiff(diff);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, "src/alpha.ts");
  assert.equal(files[0].hunks.length, 1);
});

await test("validatePatch accepts a valid patch", async () => {
  const diff = `diff --git a/src/alpha.ts b/src/alpha.ts\n--- a/src/alpha.ts\n+++ b/src/alpha.ts\n@@ -1,3 +1,3 @@\n-export function greet(name: string) {\n+export function greet(name: string): string {\n   return \`hello \${name}\`;\n }\n`;
  const result = await validatePatch(diff, repoDir);
  assert.equal(result.ok, true, JSON.stringify(result));
});

await test("validatePatch rejects malformed paths", async () => {
  const diff = `diff --git a/../etc/passwd b/../etc/passwd\n--- a/../etc/passwd\n+++ b/../etc/passwd\n@@ -1,1 +1,1 @@\n-old\n+new\n`;
  const result = await validatePatch(diff, repoDir);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("..")));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
