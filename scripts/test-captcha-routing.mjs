#!/usr/bin/env node
/**
 * Smoke-test the CaptchaSolver routing + fallback chain.
 *
 * Validates:
 *   - Image captcha with NO paid keys → vision-LLM is tried first.
 *   - Token captcha with NO paid keys + no audio + no interactive → fails
 *     gracefully with a meaningful error (no infinite hang).
 *   - Disabled config rejects.
 *   - Paid provider with valid key + image kind → vision-LLM still tried
 *     first (it's free), paid provider as backup.
 *   - Empty solution from vision falls through to next provider.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { CaptchaSolver } = require("../dist/src/tools/browser/captcha-solver.js");

const baseConfig = {
  enabled: true,
  providers: ["2captcha", "anticaptcha", "capsolver", "vision-llm"],
  apiKeyEnv: {
    twoCaptcha: "TWOCAPTCHA_API_KEY_TEST",
    antiCaptcha: "ANTICAPTCHA_API_KEY_TEST",
    capSolver: "CAPSOLVER_API_KEY_TEST",
  },
  pollIntervalMs: 50,
  maxWaitMs: 200,
};

function makeVision(text = "ABCD42") {
  let calls = 0;
  return {
    solveImage: async () => {
      calls += 1;
      return text;
    },
    get calls() {
      return calls;
    },
  };
}

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

console.log("CaptchaSolver routing");

await test("disabled config rejects", async () => {
  const solver = new CaptchaSolver({ ...baseConfig, enabled: false });
  await assert.rejects(() => solver.solve({ kind: "image", pageUrl: "http://x", imageBase64: "AAA" }));
});

await test("image kind + no paid keys → vision-LLM solves", async () => {
  delete process.env.TWOCAPTCHA_API_KEY_TEST;
  delete process.env.ANTICAPTCHA_API_KEY_TEST;
  delete process.env.CAPSOLVER_API_KEY_TEST;
  const vision = makeVision("HELLO");
  const solver = new CaptchaSolver(baseConfig, { visionFallback: vision });
  const result = await solver.solve({ kind: "image", pageUrl: "http://x", imageBase64: "AAA" });
  assert.equal(result.solution, "HELLO");
  assert.equal(result.provider, "vision-llm");
  assert.equal(vision.calls, 1);
});

await test("token kind + no keys + no audio + no interactive → fails cleanly", async () => {
  const solver = new CaptchaSolver(baseConfig, { visionFallback: makeVision() });
  await assert.rejects(
    () => solver.solve({ kind: "recaptcha-v2", pageUrl: "http://x", siteKey: "abc" }),
    /All captcha providers failed/,
  );
});

await test("token kind + interactive fallback succeeds when external dies", async () => {
  let prompted = false;
  const interactive = {
    prompt: async () => {
      prompted = true;
      return "MANUAL_TOKEN_123";
    },
  };
  const solver = new CaptchaSolver(baseConfig, { interactiveFallback: interactive });
  const result = await solver.solve({ kind: "recaptcha-v2", pageUrl: "http://x", siteKey: "abc" });
  assert.equal(result.solution, "MANUAL_TOKEN_123");
  assert.equal(result.provider, "interactive");
  assert.equal(prompted, true);
});

await test("image kind: vision-LLM tried before paid provider even if key present", async () => {
  process.env.TWOCAPTCHA_API_KEY_TEST = "fake-key";
  let twoCaptchaCalled = false;
  // Patch global fetch so 2captcha "submission" would fail loudly if called.
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    twoCaptchaCalled = true;
    throw new Error("fetch should not be called: vision-LLM should solve first");
  };
  try {
    const vision = makeVision("FIRST");
    const solver = new CaptchaSolver(baseConfig, { visionFallback: vision });
    const result = await solver.solve({ kind: "image", pageUrl: "http://x", imageBase64: "AAA" });
    assert.equal(result.provider, "vision-llm");
    assert.equal(twoCaptchaCalled, false);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.TWOCAPTCHA_API_KEY_TEST;
  }
});

await test("vision returns empty → falls through to next available provider", async () => {
  const emptyVision = { solveImage: async () => "" };
  let interactiveAsked = false;
  const interactive = {
    prompt: async () => {
      interactiveAsked = true;
      return "INTERACTIVE";
    },
  };
  const solver = new CaptchaSolver(baseConfig, {
    visionFallback: emptyVision,
    interactiveFallback: interactive,
  });
  const result = await solver.solve({ kind: "image", pageUrl: "http://x", imageBase64: "AAA" });
  assert.equal(result.provider, "interactive");
  assert.equal(interactiveAsked, true);
  assert.equal(result.solution, "INTERACTIVE");
});

if (process.exitCode) {
  console.log("\nFAIL");
} else {
  console.log("\nOK");
}
