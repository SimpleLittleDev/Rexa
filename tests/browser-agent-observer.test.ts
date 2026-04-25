import { describe, expect, test } from "vitest";
import { BrowserTool, type BrowserAdapter } from "../src/tools/browser/browser.tool";
import type { BrowserAgentObserver } from "../src/tools/browser/browser-agent-observer";

class FakeBrowserAdapter implements BrowserAdapter {
  events: string[] = [];
  async open(url: string): Promise<void> {
    this.events.push(`open:${url}`);
  }
  async screenshot(path?: string): Promise<Buffer | string> {
    return path ?? "bufferless-shot";
  }
  async moveMouse(x: number, y: number): Promise<void> {
    this.events.push(`move:${x},${y}`);
  }
  async click(x: number, y: number): Promise<void> {
    this.events.push(`click:${x},${y}`);
  }
  async clickBySelector(selector: string): Promise<void> {
    this.events.push(`selector:${selector}`);
  }
  async clickByText(text: string): Promise<void> {
    this.events.push(`text:${text}`);
  }
  async type(selector: string, text: string): Promise<void> {
    this.events.push(`type:${selector}:${text}`);
  }
  async uploadFile(selector: string, path: string): Promise<void> {
    this.events.push(`upload:${selector}:${path}`);
  }
  async scroll(direction: "up" | "down", amount: number): Promise<void> {
    this.events.push(`scroll:${direction}:${amount}`);
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

describe("BrowserTool agent observer", () => {
  test("reports opened URLs and sends a screenshot after browser actions", async () => {
    const updates: Array<{ event: string; screenshotPath?: string }> = [];
    const observer: BrowserAgentObserver = {
      onBrowserEvent: async (event) => {
        updates.push({ event: event.action, screenshotPath: event.screenshotPath });
      },
    };
    const browser = new BrowserTool(new FakeBrowserAdapter(), {
      observer,
      screenshotUpdates: true,
      screenshotDir: "data/test-screenshots",
    });

    await browser.open("https://example.com");
    await browser.moveMouse(10, 20);
    await browser.click(10, 20);

    expect(updates.map((update) => update.event)).toEqual(["open", "moveMouse", "click"]);
    expect(updates[0]?.screenshotPath).toContain("data/test-screenshots");
  });

  test("does not fail the browser action when screenshot reporting fails", async () => {
    class ScreenshotFailingAdapter extends FakeBrowserAdapter {
      override async screenshot(): Promise<Buffer | string> {
        throw new Error("screencap unavailable");
      }
    }

    const updates: Array<{ action: string; message: string; reportingError?: unknown }> = [];
    const browser = new BrowserTool(new ScreenshotFailingAdapter(), {
      observer: {
        onBrowserEvent: (event) => {
          updates.push({
            action: event.action,
            message: event.message,
            reportingError: event.metadata?.reportingError,
          });
        },
      },
      screenshotUpdates: true,
      screenshotDir: "data/test-screenshots",
    });

    const result = await browser.open("https://example.com");

    expect(result.success).toBe(true);
    expect(updates[0]).toMatchObject({
      action: "open",
      reportingError: true,
    });
    expect(updates[0]?.message).toContain("Screenshot/update gagal");
  });
});
