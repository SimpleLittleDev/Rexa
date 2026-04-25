#!/usr/bin/env node
/**
 * End-to-end smoke test for BrowserTool.solveCaptcha:
 * - Constructs a fake BrowserAdapter that simulates a page with a
 *   reCAPTCHA v2 element + image captcha.
 * - Validates auto-detection picks reCAPTCHA, solver routes through to
 *   interactive (since no paid keys / no vision-LLM able to solve a
 *   token kind), and the response is injected back into the DOM.
 * - Validates explicit `selector` path for an image captcha goes through
 *   vision-LLM and the answer is returned.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { BrowserTool } = require("../dist/src/tools/browser/browser.tool.js");
const { CaptchaSolver } = require("../dist/src/tools/browser/captcha-solver.js");

const captchaConfig = {
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

class FakeAdapter {
  constructor(state) {
    this.state = state;
    this.actions = [];
  }
  async open() {}
  async screenshot() { return ""; }
  async moveMouse() {}
  async click() {}
  async clickBySelector() {}
  async clickByText() {}
  async type() {}
  async uploadFile() {}
  async scroll() {}
  async getDom() { return ""; }
  async getVisibleText() { return ""; }
  async findElement() { return null; }
  async waitForNavigation() {}
  async close() {}
  async evaluate(fn /* string | Function */) {
    const code = typeof fn === "string" ? fn : fn.toString();
    this.actions.push(code.slice(0, 80));
    // Injection (more specific) — check first.
    if (code.includes("g-recaptcha-response") && code.includes("getElementById")) {
      this.state.injected = code.match(/t\.value = "([^"]*)"/)?.[1];
      return undefined;
    }
    if (code.includes("h-captcha-response")) {
      this.state.injected = code.match(/t\.value = "([^"]*)"/)?.[1];
      return undefined;
    }
    if (code.includes("cf-turnstile-response")) {
      this.state.injected = code.match(/t\.value = "([^"]*)"/)?.[1];
      return undefined;
    }
    // Detection (broader).
    if (code.includes("location.href") && code.includes("g-recaptcha")) {
      if (this.state.kind === "recaptcha-v2") {
        return { kind: "recaptcha-v2", siteKey: this.state.siteKey, pageUrl: this.state.pageUrl };
      }
      if (this.state.kind === "image-captcha") {
        return null;
      }
    }
    if (code.includes("canvas.toDataURL")) {
      return this.state.imageBase64 ?? null;
    }
    return undefined;
  }
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

console.log("BrowserTool.solveCaptcha");

await test("recaptcha-v2 detected → interactive solver supplies token → injected", async () => {
  const adapter = new FakeAdapter({ kind: "recaptcha-v2", siteKey: "abc", pageUrl: "http://x" });
  const interactive = { prompt: async () => "MANUAL_TOKEN_X" };
  const solver = new CaptchaSolver(captchaConfig, { interactiveFallback: interactive });
  const tool = new BrowserTool(adapter, {}, solver);
  const result = await tool.solveCaptcha();
  assert.equal(result.success, true);
  assert.equal(result.data.solution, "MANUAL_TOKEN_X");
  assert.equal(result.data.provider, "interactive");
  assert.ok(adapter.state.injected?.includes("MANUAL_TOKEN_X"));
});

await test("image kind via selector → vision-LLM solves", async () => {
  const adapter = new FakeAdapter({ kind: "image-captcha", imageBase64: "AAA", pageUrl: "http://x" });
  const vision = { solveImage: async () => "BANANA42" };
  const solver = new CaptchaSolver(captchaConfig, { visionFallback: vision });
  const tool = new BrowserTool(adapter, {}, solver);
  const result = await tool.solveCaptcha({ selector: "img.captcha" });
  assert.equal(result.success, true);
  assert.equal(result.data.solution, "BANANA42");
  assert.equal(result.data.provider, "vision-llm");
});

await test("no captcha detected and no selector → returns recoverable error", async () => {
  const adapter = new FakeAdapter({ kind: "image-captcha", pageUrl: "http://x" });
  const solver = new CaptchaSolver(captchaConfig, {});
  const tool = new BrowserTool(adapter, {}, solver);
  const result = await tool.solveCaptcha();
  assert.equal(result.success, false);
  assert.match(result.error.message, /Could not detect CAPTCHA/);
});

await test("no captcha solver wired → returns CAPTCHA_DISABLED", async () => {
  const adapter = new FakeAdapter({ kind: "recaptcha-v2", siteKey: "abc", pageUrl: "http://x" });
  const tool = new BrowserTool(adapter, {});
  const result = await tool.solveCaptcha();
  assert.equal(result.success, false);
  assert.equal(result.error.code, "CAPTCHA_DISABLED");
});

if (process.exitCode) {
  console.log("\nFAIL");
} else {
  console.log("\nOK");
}
