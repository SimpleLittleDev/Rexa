import type { AppConfig } from "../../app/config";
import { BrowserTool, type BrowserAdapter } from "./browser.tool";
import { ChromiumTermuxAdapter } from "./chromium-termux.adapter";
import { PlaywrightAdapter } from "./playwright.adapter";
import { RemoteBrowserAdapter } from "./remote-browser.adapter";
import type { BrowserAgentObserver } from "./browser-agent-observer";

export interface BrowserToolFactoryOptions {
  observer?: BrowserAgentObserver;
  adapter?: BrowserAdapter;
}

export type BrowserToolFactory = (options?: BrowserToolFactoryOptions) => BrowserTool;

export function createBrowserTool(config: Pick<AppConfig, "browserMode" | "browserAgent">, options: BrowserToolFactoryOptions = {}): BrowserTool {
  return new BrowserTool(options.adapter ?? createBrowserAdapter(config.browserMode), {
    observer: options.observer,
    screenshotUpdates: config.browserAgent.screenshotUpdates,
    screenshotDir: config.browserAgent.screenshotDir,
    updateAfterActions: config.browserAgent.updateAfterActions,
  });
}

export function createBrowserAdapter(mode: AppConfig["browserMode"]): BrowserAdapter {
  if (mode === "termux-chromium") return new ChromiumTermuxAdapter();
  if (mode === "remote-browser") return new RemoteBrowserAdapter();
  if (mode === "playwright") return new PlaywrightAdapter({ headless: true });
  return isTermuxRuntime() ? new ChromiumTermuxAdapter() : new PlaywrightAdapter({ headless: true });
}

function isTermuxRuntime(): boolean {
  return Boolean(process.env.PREFIX?.includes("com.termux") || process.env.TERMUX_VERSION || process.env.ANDROID_ROOT);
}
