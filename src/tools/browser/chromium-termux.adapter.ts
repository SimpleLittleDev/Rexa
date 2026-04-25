import { execFile, spawn } from "node:child_process";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import type { BrowserAdapter } from "./browser.tool";

const execFileAsync = promisify(execFile);

export type AndroidCommandExecutor = (command: string, args: string[], options?: { timeout?: number }) => Promise<{ stdout: string; stderr: string }>;
export type BrowserProcessLauncher = (command: string, args: string[]) => Promise<void>;

export interface ChromiumTermuxAdapterOptions {
  chromiumCommands?: string[];
  execFile?: AndroidCommandExecutor;
  launchBrowser?: BrowserProcessLauncher;
}

export class ChromiumTermuxAdapter implements BrowserAdapter {
  private currentUrl: string | null = null;
  private readonly chromiumCommands: string[];
  private readonly runCommand: AndroidCommandExecutor;
  private readonly launchBrowser: BrowserProcessLauncher;

  constructor(options: ChromiumTermuxAdapterOptions = {}) {
    this.chromiumCommands = options.chromiumCommands ?? defaultChromiumCommands();
    this.runCommand = options.execFile ?? runExecFile;
    this.launchBrowser = options.launchBrowser ?? launchDetachedBrowser;
  }

  async open(url: string): Promise<void> {
    this.currentUrl = url;
    const errors: string[] = [];
    for (const command of this.chromiumCommands) {
      try {
        await this.launchBrowser(command, [url]);
        return;
      } catch (error) {
        errors.push(`${command}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`Chromium command is not available or failed. Tried: ${errors.join("; ")}`);
  }

  async screenshot(path = "data/screenshots/termux-screen.png"): Promise<string> {
    await mkdir(dirname(path), { recursive: true });
    await this.screencap(path);
    return path;
  }

  async moveMouse(_x: number, _y: number): Promise<void> {
    return;
  }

  async click(x: number, y: number): Promise<void> {
    await this.runAndroidCommand("input", ["tap", String(x), String(y)]);
  }

  async clickBySelector(): Promise<void> {
    throw new Error("Termux Android fallback cannot click by selector; use coordinates or remote browser mode.");
  }

  async clickByText(): Promise<void> {
    throw new Error("Termux Android fallback cannot click by text; use coordinates or remote browser mode.");
  }

  async type(_selector: string, text: string): Promise<void> {
    await this.runAndroidCommand("input", ["text", text.replace(/\s/g, "%s")]);
  }

  async uploadFile(): Promise<void> {
    throw new Error("File upload is unavailable in Android fallback mode.");
  }

  async scroll(direction: "up" | "down", amount: number): Promise<void> {
    const y1 = direction === "down" ? 900 : 300;
    const y2 = direction === "down" ? 300 : 900;
    await this.runAndroidCommand("input", ["swipe", "500", String(y1), "500", String(y2), String(amount)]);
  }

  async getDom(): Promise<string> {
    return "";
  }

  async getVisibleText(): Promise<string> {
    const output = await this.runAndroidCommand("uiautomator", ["dump", "/dev/tty"]);
    return output.stdout;
  }

  async findElement(query: string): Promise<unknown> {
    return { query, mode: "android-uiautomator", currentUrl: this.currentUrl };
  }

  async waitForNavigation(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async close(): Promise<void> {
    return;
  }

  private async screencap(path: string): Promise<void> {
    try {
      await this.runCommand("screencap", ["-p", path], { timeout: 5_000 });
    } catch (error) {
      if (!isMissingCommand(error)) {
        await this.chromiumScreenshot(path, error);
        return;
      }
      try {
        await this.runCommand("/system/bin/screencap", ["-p", path], { timeout: 5_000 });
      } catch (systemError) {
        await this.chromiumScreenshot(path, systemError);
      }
    }
  }

  private async chromiumScreenshot(path: string, previousError: unknown): Promise<void> {
    if (!this.currentUrl) throw previousError;
    const errors: string[] = [];
    for (const command of this.chromiumCommands) {
      try {
        await this.runCommand(
          command,
          ["--headless", "--disable-gpu", `--screenshot=${path}`, this.currentUrl],
          { timeout: 30_000 },
        );
        return;
      } catch (error) {
        errors.push(`${command}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`Screenshot failed. Android capture failed: ${previousError instanceof Error ? previousError.message : String(previousError)}. Chromium screenshot failed: ${errors.join("; ")}`);
  }

  private async runAndroidCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    try {
      return await this.runCommand(command, args, { timeout: 5_000 });
    } catch (error) {
      if (!isMissingCommand(error)) throw error;
      return this.runCommand(`/system/bin/${command}`, args, { timeout: 5_000 });
    }
  }
}

function defaultChromiumCommands(): string[] {
  return [
    process.env.REXA_CHROMIUM_COMMAND,
    "chromium-browser",
    "chromium",
    "google-chrome",
    "google-chrome-stable",
  ].filter(Boolean) as string[];
}

async function runExecFile(command: string, args: string[], options?: { timeout?: number }): Promise<{ stdout: string; stderr: string }> {
  const output = await execFileAsync(command, args, options);
  return {
    stdout: String(output.stdout),
    stderr: String(output.stderr),
  };
}

async function launchDetachedBrowser(command: string, args: string[]): Promise<void> {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const done = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
    child.once("error", done);
    child.once("spawn", () => {
      child.unref();
      done();
    });
  });
}

function isMissingCommand(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "ENOENT");
}
