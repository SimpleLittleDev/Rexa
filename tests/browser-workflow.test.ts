import { describe, expect, test } from "vitest";
import { BrowserWorkflow, parseBrowserRequest } from "../src/agent/browser-workflow";
import { BrowserTool, type BrowserAdapter } from "../src/tools/browser/browser.tool";
import type { BrowserAgentEvent, BrowserAgentObserver } from "../src/tools/browser/browser-agent-observer";

class FakeBrowserAdapter implements BrowserAdapter {
  readonly actions: string[] = [];

  async open(url: string): Promise<void> {
    this.actions.push(`open:${url}`);
  }

  async screenshot(path?: string): Promise<Buffer | string> {
    this.actions.push(`screenshot:${path ?? "buffer"}`);
    return path ?? "buffer";
  }

  async moveMouse(x: number, y: number): Promise<void> {
    this.actions.push(`moveMouse:${x},${y}`);
  }

  async click(x: number, y: number): Promise<void> {
    this.actions.push(`click:${x},${y}`);
  }

  async clickBySelector(selector: string): Promise<void> {
    this.actions.push(`clickBySelector:${selector}`);
  }

  async clickByText(text: string): Promise<void> {
    this.actions.push(`clickByText:${text}`);
  }

  async type(selector: string, text: string): Promise<void> {
    this.actions.push(`type:${selector}:${text}`);
  }

  async uploadFile(selector: string, path: string): Promise<void> {
    this.actions.push(`uploadFile:${selector}:${path}`);
  }

  async scroll(direction: "up" | "down", amount: number): Promise<void> {
    this.actions.push(`scroll:${direction}:${amount}`);
  }

  async getDom(): Promise<string> {
    return "<html></html>";
  }

  async getVisibleText(): Promise<string> {
    return "visible";
  }

  async findElement(query: string): Promise<unknown> {
    return { query };
  }

  async waitForNavigation(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    return;
  }
}

describe("BrowserWorkflow", () => {
  test("maps an Indonesian request to search YouTube in a browser and emits screenshot updates", async () => {
    expect(parseBrowserRequest("bisa buka browser dan cari YouTube?").url).toBe("https://www.google.com/search?q=YouTube");
    expect(parseBrowserRequest("buka YouTube").url).toBe("https://www.youtube.com");
    expect(parseBrowserRequest("buka YouTube setelah itu resolve captcha nya").url).toBe("https://www.youtube.com");

    const adapter = new FakeBrowserAdapter();
    const events: BrowserAgentEvent[] = [];
    const observer: BrowserAgentObserver = {
      onBrowserEvent: (event) => {
        events.push(event);
      },
    };
    const browser = new BrowserTool(adapter, {
      observer,
      screenshotUpdates: true,
      screenshotDir: "data/test-browser-workflow",
      updateAfterActions: ["open", "moveMouse"],
    });
    const workflow = new BrowserWorkflow(browser);

    const result = await workflow.run("bisa buka browser dan cari YouTube?");

    expect(result.status).toBe("completed");
    expect(result.summary).toBe("Sudah, aku buka Google search: YouTube di Chromium: https://www.google.com/search?q=YouTube");
    expect(adapter.actions).toContain("open:https://www.google.com/search?q=YouTube");
    expect(adapter.actions).toContain("moveMouse:240,360");
    expect(events.map((event) => event.action)).toEqual(["open", "moveMouse"]);
    expect(events[0]?.screenshotPath).toContain("data/test-browser-workflow");
  });
});
