import type { BrowserAdapter } from "./browser.tool";

export class RemoteBrowserAdapter implements BrowserAdapter {
  constructor(private readonly endpoint = process.env.REXA_REMOTE_BROWSER_URL) {}

  async open(url: string): Promise<void> {
    await this.call("open", { url });
  }

  async screenshot(path?: string): Promise<string> {
    const result = await this.call("screenshot", { path });
    return String(result.path ?? result.dataUrl ?? "");
  }

  async moveMouse(x: number, y: number): Promise<void> {
    await this.call("moveMouse", { x, y });
  }

  async click(x: number, y: number): Promise<void> {
    await this.call("click", { x, y });
  }

  async clickBySelector(selector: string): Promise<void> {
    await this.call("clickBySelector", { selector });
  }

  async clickByText(text: string): Promise<void> {
    await this.call("clickByText", { text });
  }

  async type(selector: string, text: string): Promise<void> {
    await this.call("type", { selector, text });
  }

  async uploadFile(selector: string, path: string): Promise<void> {
    await this.call("uploadFile", { selector, path });
  }

  async scroll(direction: "up" | "down", amount: number): Promise<void> {
    await this.call("scroll", { direction, amount });
  }

  async getDom(): Promise<string> {
    return String((await this.call("getDom", {})).dom ?? "");
  }

  async getVisibleText(): Promise<string> {
    return String((await this.call("getVisibleText", {})).text ?? "");
  }

  async findElement(query: string): Promise<unknown> {
    return this.call("findElement", { query });
  }

  async waitForNavigation(): Promise<void> {
    await this.call("waitForNavigation", {});
  }

  async close(): Promise<void> {
    await this.call("close", {});
  }

  private async call(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.endpoint) throw new Error("REXA_REMOTE_BROWSER_URL is not configured");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) throw new Error(`Remote browser failed: ${response.status} ${await response.text()}`);
    return (await response.json()) as Record<string, unknown>;
  }
}
