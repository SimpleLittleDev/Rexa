import type { AppConfig } from "../../app/config";
import type { BrowserAgentObserver } from "./browser-agent-observer";
import { BrowserTool, type BrowserAdapter } from "./browser.tool";
import { ChromiumAdapter } from "./chromium.adapter";
import { PlaywrightAdapter } from "./playwright.adapter";
import { RemoteBrowserAdapter } from "./remote-browser.adapter";

export interface BrowserToolFactoryOptions {
  observer?: BrowserAgentObserver;
  adapter?: BrowserAdapter;
}

export type BrowserToolFactory = (options?: BrowserToolFactoryOptions) => BrowserTool;

export function createBrowserTool(
  config: Pick<AppConfig, "browserMode" | "browserAgent">,
  options: BrowserToolFactoryOptions = {},
): BrowserTool {
  return new BrowserTool(options.adapter ?? createBrowserAdapter(config.browserMode), {
    observer: options.observer,
    screenshotUpdates: config.browserAgent.screenshotUpdates,
    screenshotDir: config.browserAgent.screenshotDir,
    updateAfterActions: config.browserAgent.updateAfterActions,
  });
}

export function createBrowserAdapter(mode: AppConfig["browserMode"]): BrowserAdapter {
  if (mode === "chromium") return new ChromiumAdapter();
  if (mode === "remote-browser") return new RemoteBrowserAdapter();
  if (mode === "playwright") return new PlaywrightAdapter({ headless: true });
  if (mode === "limited") return new ChromiumAdapter({ headless: true });
  // "auto" or unspecified: pick chromium with sensible defaults.
  return new ChromiumAdapter({ headless: true });
}
