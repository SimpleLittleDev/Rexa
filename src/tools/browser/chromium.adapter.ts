import { access, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { platform } from "node:os";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import type { BrowserAdapter } from "./browser.tool";

const requireOptional = createRequire(__filename);

export interface ChromiumAdapterOptions {
  headless?: boolean;
  executablePath?: string;
  userDataDir?: string;
  channel?: "chrome" | "chrome-beta" | "chrome-canary" | "msedge" | "chromium";
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezoneId?: string;
  deviceScaleFactor?: number;
  args?: string[];
  proxy?: { server: string; username?: string; password?: string };
  acceptDownloads?: boolean;
  ignoreHTTPSErrors?: boolean;
  bypassCSP?: boolean;
  stealth?: boolean;
  defaultNavigationTimeoutMs?: number;
}

const DEFAULT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

const DEFAULT_VIEWPORT = { width: 1366, height: 820 };

const STEALTH_SCRIPT = `
(() => {
  try {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    const original = navigator.permissions && navigator.permissions.query;
    if (original) {
      navigator.permissions.query = (params) =>
        params && params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : original(params);
    }
    const protoAddTrustToken = function () {};
    if (window.chrome === undefined) {
      window.chrome = { runtime: {}, app: {} };
    }
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
  } catch (_) {
    // best-effort stealth
  }
})();
`;

const DEFAULT_CHROMIUM_CANDIDATES: Record<string, string[]> = {
  linux: [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
    "/usr/lib/chromium/chromium",
    "/usr/lib/chromium-browser/chromium-browser",
  ],
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ],
};

export async function detectChromiumExecutable(): Promise<string | null> {
  const explicit = process.env.REXA_CHROMIUM_PATH ?? process.env.CHROMIUM_PATH;
  if (explicit && (await canRead(explicit))) return explicit;
  const candidates = DEFAULT_CHROMIUM_CANDIDATES[platform()] ?? DEFAULT_CHROMIUM_CANDIDATES.linux ?? [];
  for (const path of candidates) {
    if (await canRead(path)) return path;
  }
  // Fallback: look up via PATH for common binary names.
  const binaryNames = platform() === "win32"
    ? ["chrome.exe", "chromium.exe", "msedge.exe"]
    : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"];
  for (const name of binaryNames) {
    const found = await whichBinary(name);
    if (found) return found;
  }
  return null;
}

async function whichBinary(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(platform() === "win32" ? "where" : "which", [name], { stdio: ["ignore", "pipe", "ignore"] });
    let buffer = "";
    proc.stdout?.on("data", (chunk) => {
      buffer += String(chunk);
    });
    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      const path = buffer.split("\n")[0]?.trim();
      resolve(path || null);
    });
  });
}

async function canRead(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export class ChromiumAdapter implements BrowserAdapter {
  private browser: any | null = null;
  private context: any | null = null;
  private page: any | null = null;
  private readonly options: ChromiumAdapterOptions;

  constructor(options: ChromiumAdapterOptions = {}) {
    this.options = {
      headless: true,
      stealth: true,
      acceptDownloads: true,
      ignoreHTTPSErrors: false,
      bypassCSP: false,
      defaultNavigationTimeoutMs: 30_000,
      ...options,
    };
  }

  async open(url: string): Promise<void> {
    const page = await this.ensurePage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.options.defaultNavigationTimeoutMs });
  }

  async screenshot(path?: string): Promise<Buffer | string> {
    const page = await this.ensurePage();
    if (path) {
      await mkdir(dirname(path), { recursive: true });
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
    await (await this.ensurePage()).getByText(text).first().click();
  }

  async type(selector: string, text: string): Promise<void> {
    const page = await this.ensurePage();
    await page.fill(selector, text);
  }

  async uploadFile(selector: string, path: string): Promise<void> {
    await (await this.ensurePage()).setInputFiles(selector, path);
  }

  async scroll(direction: "up" | "down", amount: number): Promise<void> {
    const page = await this.ensurePage();
    await page.mouse.wheel(0, direction === "down" ? amount : -amount);
  }

  async getDom(): Promise<string> {
    return (await this.ensurePage()).content();
  }

  async getVisibleText(): Promise<string> {
    return (await this.ensurePage()).locator("body").innerText();
  }

  async findElement(query: string): Promise<unknown> {
    const page = await this.ensurePage();
    const locator = looksLikeSelector(query) ? page.locator(query) : page.getByText(query);
    const first = locator.first();
    const box = await first.boundingBox();
    return { query, box };
  }

  async waitForNavigation(): Promise<void> {
    await (await this.ensurePage()).waitForLoadState("domcontentloaded");
  }

  async close(): Promise<void> {
    try {
      await this.context?.close();
    } catch {
      // ignore
    }
    try {
      await this.browser?.close();
    } catch {
      // ignore
    }
    this.context = null;
    this.browser = null;
    this.page = null;
  }

  /** Extra power features beyond the base adapter contract. */

  async waitForSelector(selector: string, timeoutMs = 15_000): Promise<void> {
    await (await this.ensurePage()).waitForSelector(selector, { timeout: timeoutMs });
  }

  async waitForText(text: string, timeoutMs = 15_000): Promise<void> {
    await (await this.ensurePage()).getByText(text).first().waitFor({ timeout: timeoutMs });
  }

  async evaluate<T = unknown>(fn: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T> {
    const page = await this.ensurePage();
    return page.evaluate(fn, ...args);
  }

  async pdf(path: string): Promise<string> {
    const page = await this.ensurePage();
    await mkdir(dirname(path), { recursive: true });
    await page.pdf({ path, format: "A4", printBackground: true });
    return path;
  }

  async cookies(): Promise<unknown[]> {
    const context = await this.ensureContext();
    return context.cookies();
  }

  async setCookies(cookies: Array<Record<string, unknown>>): Promise<void> {
    const context = await this.ensureContext();
    await context.addCookies(cookies);
  }

  async newPage(): Promise<unknown> {
    const context = await this.ensureContext();
    const page = await context.newPage();
    this.page = page;
    return page;
  }

  async pages(): Promise<unknown[]> {
    const context = await this.ensureContext();
    return context.pages();
  }

  async setViewport(width: number, height: number): Promise<void> {
    await (await this.ensurePage()).setViewportSize({ width, height });
  }

  async setUserAgent(userAgent: string): Promise<void> {
    const context = await this.ensureContext();
    await context.setExtraHTTPHeaders({ "User-Agent": userAgent });
  }

  private async ensureContext(): Promise<any> {
    if (this.context) return this.context;
    const playwright = loadPlaywright();
    const executablePath =
      this.options.executablePath ??
      (process.env.REXA_CHROMIUM_PATH || process.env.CHROMIUM_PATH || (await detectChromiumExecutable()) || undefined);
    const launchArgs = mergeLaunchArgs(this.options.args);
    if (this.options.userDataDir) {
      this.context = await playwright.chromium.launchPersistentContext(this.options.userDataDir, {
        headless: this.options.headless,
        executablePath,
        channel: this.options.channel,
        args: launchArgs,
        proxy: this.options.proxy,
        acceptDownloads: this.options.acceptDownloads,
        ignoreHTTPSErrors: this.options.ignoreHTTPSErrors,
        bypassCSP: this.options.bypassCSP,
        viewport: this.options.viewport ?? DEFAULT_VIEWPORT,
        locale: this.options.locale,
        timezoneId: this.options.timezoneId,
        deviceScaleFactor: this.options.deviceScaleFactor,
        userAgent: this.options.userAgent ?? DEFAULT_UA,
      });
    } else {
      this.browser = await playwright.chromium.launch({
        headless: this.options.headless,
        executablePath,
        channel: this.options.channel,
        args: launchArgs,
        proxy: this.options.proxy,
      });
      this.context = await this.browser.newContext({
        viewport: this.options.viewport ?? DEFAULT_VIEWPORT,
        locale: this.options.locale,
        timezoneId: this.options.timezoneId,
        deviceScaleFactor: this.options.deviceScaleFactor,
        userAgent: this.options.userAgent ?? DEFAULT_UA,
        acceptDownloads: this.options.acceptDownloads,
        ignoreHTTPSErrors: this.options.ignoreHTTPSErrors,
        bypassCSP: this.options.bypassCSP,
      });
    }
    if (this.options.stealth) {
      try {
        await this.context.addInitScript(STEALTH_SCRIPT);
      } catch {
        // best-effort
      }
    }
    if (this.options.defaultNavigationTimeoutMs) {
      try {
        this.context.setDefaultNavigationTimeout(this.options.defaultNavigationTimeoutMs);
      } catch {
        // ignore
      }
    }
    return this.context;
  }

  private async ensurePage(): Promise<any> {
    if (this.page) return this.page;
    const context = await this.ensureContext();
    const existing = (context.pages?.() ?? []) as any[];
    this.page = existing[0] ?? (await context.newPage());
    return this.page;
  }
}

function loadPlaywright(): any {
  try {
    return requireOptional("playwright");
  } catch {
    try {
      return requireOptional("playwright-core");
    } catch {
      throw new Error(
        "Playwright tidak terinstall. Jalankan 'npm install playwright' lalu 'npx playwright install chromium'.",
      );
    }
  }
}

function mergeLaunchArgs(extra: string[] = []): string[] {
  const baseline = [
    "--no-default-browser-check",
    "--disable-features=Translate,BackForwardCache,AcceptCHFrame,InterestFeedContentSuggestions",
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--no-first-run",
    "--no-sandbox",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ];
  const merged = new Set<string>(baseline);
  for (const arg of extra) merged.add(arg);
  return [...merged];
}

function looksLikeSelector(query: string): boolean {
  return /^[/#.\[]/.test(query) || /\s>\s/.test(query);
}
