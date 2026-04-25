import { createRequire } from "node:module";
import type { BrowserAdapter } from "./browser.tool";

const requireOptional = createRequire(__filename);

export class PuppeteerAdapter implements BrowserAdapter {
  private browser: any | null = null;
  private page: any | null = null;

  async open(url: string): Promise<void> {
    const page = await this.ensurePage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }

  async screenshot(path?: string): Promise<Buffer | string> {
    const page = await this.ensurePage();
    return path ? (await page.screenshot({ path, fullPage: true }), path) : page.screenshot({ fullPage: true });
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
    const page = await this.ensurePage();
    const handles = await page.$x(`//*[contains(normalize-space(.), ${JSON.stringify(text)})]`);
    if (!handles[0]) throw new Error(`Text not found: ${text}`);
    await handles[0].click();
  }

  async type(selector: string, text: string): Promise<void> {
    const page = await this.ensurePage();
    await page.click(selector);
    await page.keyboard.type(text);
  }

  async uploadFile(selector: string, path: string): Promise<void> {
    const input = await (await this.ensurePage()).$(selector);
    if (!input) throw new Error(`File input not found: ${selector}`);
    await input.uploadFile(path);
  }

  async scroll(direction: "up" | "down", amount: number): Promise<void> {
    await (await this.ensurePage()).mouse.wheel({ deltaY: direction === "down" ? amount : -amount });
  }

  async getDom(): Promise<string> {
    return (await this.ensurePage()).content();
  }

  async getVisibleText(): Promise<string> {
    return (await this.ensurePage()).$eval("body", (body: HTMLElement) => body.innerText);
  }

  async findElement(query: string): Promise<unknown> {
    const page = await this.ensurePage();
    const handle = await page.$(query);
    return { query, box: handle ? await handle.boundingBox() : null };
  }

  async waitForNavigation(): Promise<void> {
    await (await this.ensurePage()).waitForNavigation({ waitUntil: "domcontentloaded" });
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }

  private async ensurePage(): Promise<any> {
    if (this.page) return this.page;
    let puppeteer: any;
    try {
      puppeteer = requireOptional("puppeteer");
    } catch {
      throw new Error("Puppeteer is not installed.");
    }
    this.browser = await puppeteer.launch({ headless: true });
    this.page = await this.browser.newPage();
    return this.page;
  }
}
