import { fail, ok, type ToolResult } from "../../common/result";
import { browserScreenshotPath, type BrowserAction, type BrowserAgentReportingOptions } from "./browser-agent-observer";
import { PlaywrightAdapter } from "./playwright.adapter";

export interface BrowserAdapter {
  open(url: string): Promise<void>;
  screenshot(path?: string): Promise<Buffer | string>;
  moveMouse(x: number, y: number): Promise<void>;
  click(x: number, y: number): Promise<void>;
  clickBySelector(selector: string): Promise<void>;
  clickByText(text: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  uploadFile(selector: string, path: string): Promise<void>;
  scroll(direction: "up" | "down", amount: number): Promise<void>;
  getDom(): Promise<string>;
  getVisibleText(): Promise<string>;
  findElement(query: string): Promise<unknown>;
  waitForNavigation(): Promise<void>;
  close(): Promise<void>;
}

export class BrowserTool {
  constructor(
    private readonly adapter: BrowserAdapter = new PlaywrightAdapter(),
    private readonly reporting: BrowserAgentReportingOptions = {},
  ) {}

  async open(url: string): Promise<ToolResult<{ url: string }>> {
    try {
      await this.adapter.open(url);
      await this.report("open", `Membuka browser: ${url}`, { url });
      return ok({ url });
    } catch (error) {
      return browserError(error);
    }
  }

  async screenshot(path?: string): Promise<ToolResult<{ screenshot: string | Buffer }>> {
    try {
      const screenshot = await this.adapter.screenshot(path);
      await this.report("screenshot", "Mengambil screenshot browser.", {
        screenshotPath: typeof screenshot === "string" ? screenshot : undefined,
      });
      return ok({ screenshot });
    } catch (error) {
      return browserError(error);
    }
  }

  async moveMouse(x: number, y: number): Promise<ToolResult<{ x: number; y: number }>> {
    try {
      await this.adapter.moveMouse(x, y);
      await this.report("moveMouse", `Mouse dipindahkan ke ${x}, ${y}.`, { x, y });
      return ok({ x, y });
    } catch (error) {
      return browserError(error);
    }
  }

  async click(x: number, y: number, options: { confirmed?: boolean; publicAction?: boolean } = {}): Promise<ToolResult<{ x: number; y: number }>> {
    if (options.publicAction && !options.confirmed) {
      return fail("CONFIRMATION_REQUIRED", "Public browser action requires confirmation", {
        recoverable: true,
      });
    }
    try {
      await this.adapter.click(x, y);
      await this.report("click", `Klik mouse di ${x}, ${y}.`, { x, y });
      return ok({ x, y });
    } catch (error) {
      return browserError(error);
    }
  }

  async clickByText(text: string): Promise<ToolResult<{ text: string }>> {
    try {
      await this.adapter.clickByText(text);
      await this.report("click", `Klik elemen dengan teks: ${text}`, { metadata: { text } });
      return ok({ text });
    } catch (error) {
      return browserError(error);
    }
  }

  async clickBySelector(selector: string): Promise<ToolResult<{ selector: string }>> {
    try {
      await this.adapter.clickBySelector(selector);
      await this.report("click", `Klik selector: ${selector}`, { selector });
      return ok({ selector });
    } catch (error) {
      return browserError(error);
    }
  }

  async type(selector: string, text: string): Promise<ToolResult<{ selector: string }>> {
    try {
      await this.adapter.type(selector, text);
      await this.report("type", `Mengisi input: ${selector}`, { selector, metadata: { length: text.length } });
      return ok({ selector });
    } catch (error) {
      return browserError(error);
    }
  }

  async uploadFile(selector: string, path: string): Promise<ToolResult<{ selector: string; path: string }>> {
    try {
      await this.adapter.uploadFile(selector, path);
      await this.report("uploadFile", `Upload file lewat selector: ${selector}`, { selector, metadata: { path } });
      return ok({ selector, path });
    } catch (error) {
      return browserError(error);
    }
  }

  async scroll(direction: "up" | "down", amount: number): Promise<ToolResult<{ direction: string; amount: number }>> {
    try {
      await this.adapter.scroll(direction, amount);
      await this.report("scroll", `Scroll ${direction} sejauh ${amount}.`, { metadata: { direction, amount } });
      return ok({ direction, amount });
    } catch (error) {
      return browserError(error);
    }
  }

  async getDom(): Promise<ToolResult<{ dom: string }>> {
    try {
      return ok({ dom: await this.adapter.getDom() });
    } catch (error) {
      return browserError(error);
    }
  }

  async getVisibleText(): Promise<ToolResult<{ text: string }>> {
    try {
      return ok({ text: await this.adapter.getVisibleText() });
    } catch (error) {
      return browserError(error);
    }
  }

  async close(): Promise<ToolResult<{ closed: true }>> {
    try {
      await this.adapter.close();
      await this.report("close", "Browser ditutup.");
      return ok({ closed: true });
    } catch (error) {
      return browserError(error);
    }
  }

  private async report(
    action: BrowserAction,
    message: string,
    event: Partial<Parameters<NonNullable<BrowserAgentReportingOptions["observer"]>["onBrowserEvent"]>[0]> = {},
  ): Promise<void> {
    if (!this.reporting.observer) return;
    try {
      const allowed = this.reporting.updateAfterActions ?? ["open", "click", "moveMouse", "type", "scroll", "uploadFile"];
      let screenshotPath = event.screenshotPath;
      if (this.reporting.screenshotUpdates && allowed.includes(action) && action !== "screenshot" && action !== "close") {
        screenshotPath = await browserScreenshotPath(this.reporting.screenshotDir ?? "data/browser-screenshots", action);
        await this.adapter.screenshot(screenshotPath);
      }
      await this.reporting.observer.onBrowserEvent({
        action,
        message,
        ...event,
        screenshotPath,
      });
    } catch (error) {
      await this.reporting.observer.onBrowserEvent({
        action,
        message: `${message} Screenshot/update gagal: ${error instanceof Error ? error.message : String(error)}`,
        ...event,
        screenshotPath: undefined,
        metadata: { ...event.metadata, reportingError: true },
      });
    }
  }
}

function browserError(error: unknown): ToolResult<never> {
  return fail("BROWSER_NOT_AVAILABLE", error instanceof Error ? error.message : String(error), {
    recoverable: true,
    suggestedFallback: "remote-browser",
  });
}
