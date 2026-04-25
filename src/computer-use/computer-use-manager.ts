import { logger } from "../logs/logger";
import type {
  ComputerUseAdapter,
  ComputerUseBackendName,
  ComputerUseConfig,
  KeyOptions,
  MouseButtonOptions,
  ScrollDirection,
  Screenshot,
} from "./computer-use-types";
import { LinuxXdotoolAdapter } from "./linux.adapter";
import { MacOSAdapter } from "./macos.adapter";
import { WindowsAdapter } from "./windows.adapter";
import { AndroidAdbAdapter } from "./android-adb.adapter";
import { NoneComputerUseAdapter } from "./none.adapter";

/**
 * High-level manager that picks the right computer-use backend for the
 * current host (or honours an explicit `backend` config). Caches the
 * decision so we don't probe `which xdotool` on every call.
 */
export class ComputerUseManager {
  private resolved: ComputerUseAdapter | null = null;

  constructor(private readonly config: ComputerUseConfig) {}

  async adapter(): Promise<ComputerUseAdapter> {
    if (this.resolved) return this.resolved;
    if (!this.config.enabled) {
      this.resolved = new NoneComputerUseAdapter();
      return this.resolved;
    }
    const candidates = this.candidates();
    for (const candidate of candidates) {
      try {
        if (await candidate.isAvailable()) {
          this.resolved = candidate;
          logger.info("[computer-use] active backend", { name: candidate.name });
          return candidate;
        }
      } catch (error) {
        logger.warn("[computer-use] availability check failed", {
          name: candidate.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    logger.warn("[computer-use] no platform backend available — falling back to none");
    this.resolved = new NoneComputerUseAdapter();
    return this.resolved;
  }

  private candidates(): ComputerUseAdapter[] {
    const screenshotDir = this.config.screenshotDir;
    const linux = new LinuxXdotoolAdapter(screenshotDir);
    const mac = new MacOSAdapter(screenshotDir);
    const win = new WindowsAdapter(screenshotDir);
    const android = new AndroidAdbAdapter(screenshotDir, this.config.androidSerial);
    const all: Record<ComputerUseBackendName, ComputerUseAdapter[]> = {
      auto: [linux, mac, win, android],
      "linux-xdotool": [linux],
      macos: [mac],
      windows: [win],
      "android-adb": [android],
      none: [new NoneComputerUseAdapter()],
    };
    return all[this.config.backend] ?? all.auto;
  }

  async availableBackends(): Promise<string[]> {
    const candidates = [
      new LinuxXdotoolAdapter(this.config.screenshotDir),
      new MacOSAdapter(this.config.screenshotDir),
      new WindowsAdapter(this.config.screenshotDir),
      new AndroidAdbAdapter(this.config.screenshotDir, this.config.androidSerial),
    ];
    const out: string[] = [];
    for (const candidate of candidates) {
      try {
        if (await candidate.isAvailable()) out.push(candidate.name);
      } catch {
        // ignore
      }
    }
    out.push("none");
    return out;
  }

  // Convenience pass-throughs so callers don't have to re-resolve every time.
  async screenshot(targetPath?: string): Promise<Screenshot> {
    return (await this.adapter()).screenshot(targetPath);
  }
  async moveMouse(x: number, y: number): Promise<void> {
    return (await this.adapter()).moveMouse(x, y);
  }
  async click(x: number, y: number, options?: MouseButtonOptions): Promise<void> {
    return (await this.adapter()).click(x, y, options);
  }
  async type(text: string): Promise<void> {
    return (await this.adapter()).type(text);
  }
  async key(combination: string, options?: KeyOptions): Promise<void> {
    return (await this.adapter()).key(combination, options);
  }
  async scroll(x: number, y: number, direction: ScrollDirection, amount?: number): Promise<void> {
    return (await this.adapter()).scroll(x, y, direction, amount);
  }
}
