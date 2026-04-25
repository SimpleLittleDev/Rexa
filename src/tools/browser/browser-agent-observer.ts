import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export type BrowserAction = "open" | "click" | "moveMouse" | "type" | "scroll" | "uploadFile" | "screenshot" | "close";

export interface BrowserAgentEvent {
  action: BrowserAction;
  message: string;
  url?: string;
  x?: number;
  y?: number;
  selector?: string;
  screenshotPath?: string;
  metadata?: Record<string, unknown>;
}

export interface BrowserAgentObserver {
  onBrowserEvent(event: BrowserAgentEvent): Promise<void> | void;
}

export interface BrowserAgentReportingOptions {
  observer?: BrowserAgentObserver;
  screenshotUpdates?: boolean;
  screenshotDir?: string;
  updateAfterActions?: BrowserAction[];
}

export async function browserScreenshotPath(dir: string, action: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  const safeAction = action.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  return join(dir, `${Date.now()}-${safeAction}.png`);
}
