import type { AppConfig } from "../../app/config";
import type { LLMRouter } from "../../llm/llm-router";
import type { BrowserAgentObserver } from "./browser-agent-observer";
import { BrowserTool, type BrowserAdapter } from "./browser.tool";
import { ChromiumAdapter } from "./chromium.adapter";
import { PlaywrightAdapter } from "./playwright.adapter";
import { RemoteBrowserAdapter } from "./remote-browser.adapter";
import {
  CaptchaSolver,
  type AudioSolver,
  type CaptchaSolverDeps,
  type InteractiveSolver,
  type VisionLLMSolver,
} from "./captcha-solver";
import { RouterVisionSolver, WhisperAudioSolver } from "./captcha-fallbacks";

export interface BrowserToolFactoryOptions {
  observer?: BrowserAgentObserver;
  adapter?: BrowserAdapter;
  visionFallback?: VisionLLMSolver;
  audioFallback?: AudioSolver;
  interactiveFallback?: InteractiveSolver;
  /**
   * If provided, an automatic vision-LLM fallback will be wired using this
   * router (vision/general roles). Explicit `visionFallback` overrides this.
   */
  router?: LLMRouter;
}

export type BrowserToolFactory = (options?: BrowserToolFactoryOptions) => BrowserTool;

export function createBrowserTool(
  config: Pick<AppConfig, "browserMode" | "browserAgent" | "captcha">,
  options: BrowserToolFactoryOptions = {},
): BrowserTool {
  let captcha: CaptchaSolver | undefined;
  if (config.captcha?.enabled) {
    const visionFallback = options.visionFallback ?? (options.router ? new RouterVisionSolver(options.router) : undefined);
    const audioFallback =
      options.audioFallback ?? (process.env.OPENAI_API_KEY ? new WhisperAudioSolver() : undefined);
    const deps: CaptchaSolverDeps = {
      visionFallback,
      audioFallback,
      interactiveFallback: options.interactiveFallback,
    };
    captcha = new CaptchaSolver(config.captcha, deps);
  }
  return new BrowserTool(
    options.adapter ?? createBrowserAdapter(config.browserMode),
    {
      observer: options.observer,
      screenshotUpdates: config.browserAgent.screenshotUpdates,
      screenshotDir: config.browserAgent.screenshotDir,
      updateAfterActions: config.browserAgent.updateAfterActions,
    },
    captcha,
  );
}

export function createBrowserAdapter(mode: AppConfig["browserMode"]): BrowserAdapter {
  if (mode === "chromium") return new ChromiumAdapter();
  if (mode === "remote-browser") return new RemoteBrowserAdapter();
  if (mode === "playwright") return new PlaywrightAdapter({ headless: true });
  if (mode === "limited") return new ChromiumAdapter({ headless: true });
  // "auto" or unspecified: pick chromium with sensible defaults.
  return new ChromiumAdapter({ headless: true });
}
