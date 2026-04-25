import { createRequire } from "node:module";
import type { BrowserAdapter } from "./browser.tool";

const requireOptional = createRequire(__filename);

export class PlaywrightAdapter implements BrowserAdapter {
  private browser: any | null = null;
  private page: any | null = null;

  constructor(private readonly options: { headless?: boolean; executablePath?: string } = {}) {}

  async open(url: string): Promise<void> {
    const page = await this.ensurePage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }

  async screenshot(path?: string): Promise<Buffer | string> {
    const page = await this.ensurePage();
    if (path) {
      await page.screenshot({ path, fullPage: true });
      return path;
    }
    return page.screenshot({ fullPage: true });
  }

  async moveMouse(x: number, y: number): Promise<void> {
    await (await this.ensurePage()).mouse.move(x, y);
  }

  async click(x: number, y: number): Promise<void> {
    await (await this.ensurePage()).mouse.click(x, y);
  }

  async clickBySelector(selector: string): Promise<void> {
    await (await this.ensurePage()).click(selector);
  }

  async clickByText(text: string): Promise<void> {
    await (await this.ensurePage()).getByText(text).click();
  }

  async type(selector: string, text: string): Promise<void> {
    await (await this.ensurePage()).fill(selector, text);
  }

  async uploadFile(selector: string, path: string): Promise<void> {
    await (await this.ensurePage()).setInputFiles(selector, path);
  }

  async scroll(direction: "up" | "down", amount: number): Promise<void> {
    await (await this.ensurePage()).mouse.wheel(0, direction === "down" ? amount : -amount);
  }

  async getDom(): Promise<string> {
    return (await this.ensurePage()).content();
  }

  async getVisibleText(): Promise<string> {
    return (await this.ensurePage()).locator("body").innerText();
  }

  async findElement(query: string): Promise<unknown> {
    const page = await this.ensurePage();
    const locator = query.startsWith("/") || query.startsWith("#") || query.startsWith(".") ? page.locator(query) : page.getByText(query);
    const box = await locator.first().boundingBox();
    return { query, box };
  }

  async waitForNavigation(): Promise<void> {
    await (await this.ensurePage()).waitForLoadState("domcontentloaded");
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }

  private async ensurePage(): Promise<any> {
    if (this.page) return this.page;
    let playwright: any;
    try {
      playwright = requireOptional("playwright");
    } catch {
      throw new Error("Playwright is not installed. Install it or use remote browser mode.");
    }
    this.browser = await playwright.chromium.launch({
      headless: this.options.headless ?? true,
      executablePath: this.options.executablePath,
    });
    this.page = await this.browser.newPage();
    return this.page;
  }
}
