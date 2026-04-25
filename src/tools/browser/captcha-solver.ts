import type { CaptchaConfig } from "../../app/config";
import { logger } from "../../logs/logger";

export type CaptchaKind =
  | "recaptcha-v2"
  | "recaptcha-v3"
  | "hcaptcha"
  | "turnstile"
  | "image"
  | "text"
  | "auto";

export interface CaptchaTask {
  /** Captcha type. `auto` lets the solver detect from page content. */
  kind: CaptchaKind;
  /** Page URL where the captcha lives. */
  pageUrl: string;
  /** Site-key / data-sitekey for token-based captchas. */
  siteKey?: string;
  /** For reCAPTCHA v3, optional action name. */
  action?: string;
  /** Min score for v3. */
  minScore?: number;
  /** For image/text captchas: base64 image (no data URI prefix). */
  imageBase64?: string;
  /** For text captchas, the question prompt. */
  question?: string;
  /** Whether to use proxy (some providers need this for region-locked sites). */
  proxy?: { url: string; type?: "http" | "https" | "socks4" | "socks5" };
  /** Optional base64 audio (wav/mp3) for audio reCAPTCHA fallback. */
  audioBase64?: string;
}

export interface CaptchaResult {
  /** Solved token (reCAPTCHA / hCaptcha / Turnstile) or text answer. */
  solution: string;
  /** Provider that produced the answer. */
  provider: string;
  /** Time taken (ms). */
  elapsedMs: number;
  metadata?: Record<string, unknown>;
}

export interface VisionLLMSolver {
  solveImage(task: { imageBase64: string; question?: string }): Promise<string>;
}

export interface AudioSolver {
  /** Transcribe an audio reCAPTCHA challenge. */
  transcribe(task: { audioBase64: string }): Promise<string>;
}

export interface InteractiveSolver {
  /**
   * Last-resort: ask a human to solve. Returns the answer/token. Implementers
   * should respect any timeout encoded in the message and gracefully reject
   * when no human is available (so we can decide to give up vs retry).
   */
  prompt(task: CaptchaTask, prompt: string): Promise<string>;
}

export interface CaptchaSolverDeps {
  visionFallback?: VisionLLMSolver;
  audioFallback?: AudioSolver;
  interactiveFallback?: InteractiveSolver;
}

type ProviderId = CaptchaConfig["providers"][number];

/**
 * Multi-provider CAPTCHA solver with graceful, efficiency-first fallback.
 *
 * Routing rules:
 *  1. Filter out providers whose required env-var is missing — never waste
 *     time submitting to a paid service we have no key for.
 *  2. For image/text captchas, prefer the (free) vision-LLM fallback
 *     before paid services, then external providers as backup.
 *  3. For token-based captchas (reCAPTCHA / hCaptcha / Turnstile) try paid
 *     providers in `config.providers` order. If none have keys, attempt
 *     audio-challenge fallback (recaptcha-v2 only) via the audio solver.
 *  4. As last resort, prompt the human via `interactiveFallback` if the
 *     surface supports it.
 */
export class CaptchaSolver {
  private readonly visionFallback?: VisionLLMSolver;
  private readonly audioFallback?: AudioSolver;
  private readonly interactiveFallback?: InteractiveSolver;

  constructor(
    private readonly config: CaptchaConfig,
    deps: VisionLLMSolver | CaptchaSolverDeps = {},
  ) {
    if (deps && "solveImage" in deps) {
      // Backwards-compatible single-arg form.
      this.visionFallback = deps;
    } else {
      this.visionFallback = (deps as CaptchaSolverDeps).visionFallback;
      this.audioFallback = (deps as CaptchaSolverDeps).audioFallback;
      this.interactiveFallback = (deps as CaptchaSolverDeps).interactiveFallback;
    }
  }

  async solve(task: CaptchaTask): Promise<CaptchaResult> {
    if (!this.config.enabled) {
      throw new Error("Captcha solving is disabled in config (app.captcha.enabled = false)");
    }
    const start = Date.now();
    const errors: string[] = [];

    const order = this.routeProviders(task);
    if (order.length === 0) {
      errors.push("no usable providers (missing keys + no fallback configured)");
    }

    for (const provider of order) {
      try {
        const solution = await this.callProvider(provider, task);
        if (solution) {
          return { solution, provider, elapsedMs: Date.now() - start, metadata: { tried: order } };
        }
        errors.push(`${provider}: empty solution`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(`[captcha] ${provider} failed`, { msg });
        errors.push(`${provider}: ${msg}`);
      }
    }

    // Audio reCAPTCHA fallback: only meaningful for v2 with audio challenge data.
    if (task.kind === "recaptcha-v2" && task.audioBase64 && this.audioFallback) {
      try {
        const transcript = await this.audioFallback.transcribe({ audioBase64: task.audioBase64 });
        if (transcript) {
          return { solution: transcript, provider: "audio-fallback", elapsedMs: Date.now() - start };
        }
      } catch (error) {
        errors.push(`audio-fallback: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (this.interactiveFallback) {
      try {
        const answer = await this.interactiveFallback.prompt(
          task,
          `Captcha solver gagal. Type=${task.kind}. URL=${task.pageUrl}. Tolong solve manually & paste token/answer.`,
        );
        if (answer) {
          return { solution: answer, provider: "interactive", elapsedMs: Date.now() - start };
        }
      } catch (error) {
        errors.push(`interactive: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`All captcha providers failed:\n${errors.join("\n")}`);
  }

  /** Decide provider order based on what's actually available + task kind. */
  private routeProviders(task: CaptchaTask): ProviderId[] {
    const isImage = task.kind === "image" || task.kind === "text";
    const order: ProviderId[] = [];
    const seen = new Set<ProviderId>();

    const add = (provider: ProviderId): void => {
      if (seen.has(provider)) return;
      if (!this.providerSupports(provider, task)) return;
      order.push(provider);
      seen.add(provider);
    };

    // Image/text → prefer vision-LLM first (it's effectively free for the
    // agent because it reuses the configured LLM).
    if (isImage && this.visionFallback) {
      add("vision-llm");
    }
    for (const provider of this.config.providers) {
      add(provider);
    }
    // Make sure vision-LLM is at least at the end for image/text tasks.
    if (isImage && this.visionFallback) {
      add("vision-llm");
    }
    return order;
  }

  private providerSupports(provider: ProviderId, task: CaptchaTask): boolean {
    if (provider === "vision-llm") {
      if (!this.visionFallback) return false;
      return task.kind === "image" || task.kind === "text";
    }
    const envKey =
      provider === "2captcha"
        ? this.config.apiKeyEnv.twoCaptcha
        : provider === "anticaptcha"
          ? this.config.apiKeyEnv.antiCaptcha
          : provider === "capsolver"
            ? this.config.apiKeyEnv.capSolver
            : null;
    if (envKey && !process.env[envKey]) return false;
    return true;
  }

  private async callProvider(provider: ProviderId, task: CaptchaTask): Promise<string> {
    switch (provider) {
      case "2captcha":
        return await this.solveTwoCaptcha(task);
      case "anticaptcha":
        return await this.solveAntiCaptcha(task);
      case "capsolver":
        return await this.solveCapSolver(task);
      case "vision-llm":
        return await this.solveVisionLLM(task);
      default:
        throw new Error(`Unknown captcha provider: ${provider}`);
    }
  }

  private async solveTwoCaptcha(task: CaptchaTask): Promise<string> {
    const apiKey = process.env[this.config.apiKeyEnv.twoCaptcha];
    if (!apiKey) throw new Error(`Missing ${this.config.apiKeyEnv.twoCaptcha}`);

    const inPayload = new URLSearchParams({ key: apiKey, json: "1" });
    if (task.kind === "recaptcha-v2") {
      inPayload.set("method", "userrecaptcha");
      if (!task.siteKey) throw new Error("recaptcha-v2 needs siteKey");
      inPayload.set("googlekey", task.siteKey);
      inPayload.set("pageurl", task.pageUrl);
    } else if (task.kind === "recaptcha-v3") {
      inPayload.set("method", "userrecaptcha");
      inPayload.set("version", "v3");
      if (!task.siteKey) throw new Error("recaptcha-v3 needs siteKey");
      inPayload.set("googlekey", task.siteKey);
      inPayload.set("pageurl", task.pageUrl);
      if (task.action) inPayload.set("action", task.action);
      if (task.minScore !== undefined) inPayload.set("min_score", String(task.minScore));
    } else if (task.kind === "hcaptcha") {
      inPayload.set("method", "hcaptcha");
      if (!task.siteKey) throw new Error("hcaptcha needs siteKey");
      inPayload.set("sitekey", task.siteKey);
      inPayload.set("pageurl", task.pageUrl);
    } else if (task.kind === "turnstile") {
      inPayload.set("method", "turnstile");
      if (!task.siteKey) throw new Error("turnstile needs siteKey");
      inPayload.set("sitekey", task.siteKey);
      inPayload.set("pageurl", task.pageUrl);
    } else if (task.kind === "image" && task.imageBase64) {
      inPayload.set("method", "base64");
      inPayload.set("body", task.imageBase64);
    } else {
      throw new Error(`2captcha does not support kind=${task.kind}`);
    }

    const inResponse = await fetch("https://2captcha.com/in.php", { method: "POST", body: inPayload });
    const inJson = (await inResponse.json()) as { status: number; request: string };
    if (inJson.status !== 1) throw new Error(`2captcha submit failed: ${inJson.request}`);

    const captchaId = inJson.request;
    const deadline = Date.now() + this.config.maxWaitMs;
    while (Date.now() < deadline) {
      await sleep(this.config.pollIntervalMs);
      const resp = await fetch(
        `https://2captcha.com/res.php?key=${encodeURIComponent(apiKey)}&action=get&id=${captchaId}&json=1`,
      );
      const json = (await resp.json()) as { status: number; request: string };
      if (json.status === 1) return json.request;
      if (json.request !== "CAPCHA_NOT_READY") throw new Error(`2captcha poll failed: ${json.request}`);
    }
    throw new Error("2captcha timeout");
  }

  private async solveAntiCaptcha(task: CaptchaTask): Promise<string> {
    const apiKey = process.env[this.config.apiKeyEnv.antiCaptcha];
    if (!apiKey) throw new Error(`Missing ${this.config.apiKeyEnv.antiCaptcha}`);

    const buildTask = (): Record<string, unknown> => {
      if (task.kind === "recaptcha-v2") {
        if (!task.siteKey) throw new Error("recaptcha-v2 needs siteKey");
        return { type: "RecaptchaV2TaskProxyless", websiteURL: task.pageUrl, websiteKey: task.siteKey };
      }
      if (task.kind === "recaptcha-v3") {
        if (!task.siteKey) throw new Error("recaptcha-v3 needs siteKey");
        return {
          type: "RecaptchaV3TaskProxyless",
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey,
          minScore: task.minScore ?? 0.3,
          pageAction: task.action ?? "verify",
        };
      }
      if (task.kind === "hcaptcha") {
        if (!task.siteKey) throw new Error("hcaptcha needs siteKey");
        return { type: "HCaptchaTaskProxyless", websiteURL: task.pageUrl, websiteKey: task.siteKey };
      }
      if (task.kind === "turnstile") {
        if (!task.siteKey) throw new Error("turnstile needs siteKey");
        return { type: "TurnstileTaskProxyless", websiteURL: task.pageUrl, websiteKey: task.siteKey };
      }
      if (task.kind === "image" && task.imageBase64) {
        return { type: "ImageToTextTask", body: task.imageBase64 };
      }
      throw new Error(`anticaptcha does not support kind=${task.kind}`);
    };

    const createResponse = await fetch("https://api.anti-captcha.com/createTask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientKey: apiKey, task: buildTask() }),
    });
    const create = (await createResponse.json()) as { errorId: number; errorDescription?: string; taskId: number };
    if (create.errorId !== 0) throw new Error(`anticaptcha createTask failed: ${create.errorDescription}`);

    const deadline = Date.now() + this.config.maxWaitMs;
    while (Date.now() < deadline) {
      await sleep(this.config.pollIntervalMs);
      const resp = await fetch("https://api.anti-captcha.com/getTaskResult", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientKey: apiKey, taskId: create.taskId }),
      });
      const json = (await resp.json()) as {
        errorId: number;
        errorDescription?: string;
        status: "ready" | "processing";
        solution?: { gRecaptchaResponse?: string; token?: string; text?: string };
      };
      if (json.errorId !== 0) throw new Error(`anticaptcha poll failed: ${json.errorDescription}`);
      if (json.status === "ready") {
        return (
          json.solution?.gRecaptchaResponse ??
          json.solution?.token ??
          json.solution?.text ??
          ""
        );
      }
    }
    throw new Error("anticaptcha timeout");
  }

  private async solveCapSolver(task: CaptchaTask): Promise<string> {
    const apiKey = process.env[this.config.apiKeyEnv.capSolver];
    if (!apiKey) throw new Error(`Missing ${this.config.apiKeyEnv.capSolver}`);

    const buildTask = (): Record<string, unknown> => {
      if (task.kind === "recaptcha-v2") {
        if (!task.siteKey) throw new Error("recaptcha-v2 needs siteKey");
        return { type: "ReCaptchaV2TaskProxyLess", websiteURL: task.pageUrl, websiteKey: task.siteKey };
      }
      if (task.kind === "recaptcha-v3") {
        if (!task.siteKey) throw new Error("recaptcha-v3 needs siteKey");
        return {
          type: "ReCaptchaV3TaskProxyLess",
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey,
          pageAction: task.action ?? "verify",
        };
      }
      if (task.kind === "hcaptcha") {
        if (!task.siteKey) throw new Error("hcaptcha needs siteKey");
        return { type: "HCaptchaTaskProxyLess", websiteURL: task.pageUrl, websiteKey: task.siteKey };
      }
      if (task.kind === "turnstile") {
        if (!task.siteKey) throw new Error("turnstile needs siteKey");
        return { type: "AntiTurnstileTaskProxyLess", websiteURL: task.pageUrl, websiteKey: task.siteKey };
      }
      if (task.kind === "image" && task.imageBase64) {
        return { type: "ImageToTextTask", body: task.imageBase64 };
      }
      throw new Error(`capsolver does not support kind=${task.kind}`);
    };

    const createResponse = await fetch("https://api.capsolver.com/createTask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientKey: apiKey, task: buildTask() }),
    });
    const create = (await createResponse.json()) as { errorId: number; errorDescription?: string; taskId?: string };
    if (create.errorId !== 0 || !create.taskId) throw new Error(`capsolver createTask failed: ${create.errorDescription}`);

    const deadline = Date.now() + this.config.maxWaitMs;
    while (Date.now() < deadline) {
      await sleep(this.config.pollIntervalMs);
      const resp = await fetch("https://api.capsolver.com/getTaskResult", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientKey: apiKey, taskId: create.taskId }),
      });
      const json = (await resp.json()) as {
        errorId: number;
        errorDescription?: string;
        status: "ready" | "processing";
        solution?: { gRecaptchaResponse?: string; token?: string; text?: string };
      };
      if (json.errorId !== 0) throw new Error(`capsolver poll failed: ${json.errorDescription}`);
      if (json.status === "ready") {
        return (
          json.solution?.gRecaptchaResponse ??
          json.solution?.token ??
          json.solution?.text ??
          ""
        );
      }
    }
    throw new Error("capsolver timeout");
  }

  private async solveVisionLLM(task: CaptchaTask): Promise<string> {
    if (!this.visionFallback) throw new Error("vision-llm fallback not configured");
    if (task.kind !== "image" && task.kind !== "text") {
      throw new Error("vision-llm fallback only supports image/text captchas");
    }
    if (!task.imageBase64) throw new Error("vision-llm needs imageBase64");
    return this.visionFallback.solveImage({ imageBase64: task.imageBase64, question: task.question });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
