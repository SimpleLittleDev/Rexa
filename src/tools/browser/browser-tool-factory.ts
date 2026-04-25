import type { AppConfig } from "../../app/config";
import type { BrowserAgentObserver } from "./browser-agent-observer";
import { BrowserTool, type BrowserAdapter } from "./browser.tool";
import { ChromiumAdapter } from "./chromium.adapter";
import { PlaywrightAdapter } from "./playwright.adapter";
import { RemoteBrowserAdapter } from "./remote-browser.adapter";
import { CaptchaSolver, type VisionLLMSolver } from "./captcha-solver";

export interface BrowserToolFactoryOptions {
  observer?: BrowserAgentObserver;
  adapter?: BrowserAdapter;
  visionFallback?: VisionLLMSolver;
}

export type BrowserToolFactory = (options?: BrowserToolFactoryOptions) => BrowserTool;

export function createBrowserTool(
  config: Pick<AppConfig, "browserMode" | "browserAgent" | "captcha">,
  options: BrowserToolFactoryOptions = {},
): BrowserTool {
  const captcha = config.captcha?.enabled ? new CaptchaSolver(config.captcha, options.visionFallback) : undefined;
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
