import { join } from "node:path";
import { mkdir, stat } from "node:fs/promises";
import type {
  ComputerUseAdapter,
  KeyOptions,
  MouseButtonOptions,
  ScrollDirection,
  Screenshot,
} from "./computer-use-types";
import { run, which } from "./process-utils";

/**
 * Linux backend using xdotool (input) + scrot/maim (capture).
 *
 * - xdotool drives mouse + keyboard via the X protocol.
 * - scrot or maim writes a PNG of the active display.
 * - We avoid Wayland-only tooling for now; on Wayland desktops the
 *   adapter degrades gracefully (isAvailable() returns false).
 */
export class LinuxXdotoolAdapter implements ComputerUseAdapter {
  readonly name = "linux-xdotool";

  constructor(private readonly screenshotDir: string) {}

  async isAvailable(): Promise<boolean> {
    if (process.platform !== "linux") return false;
    if (!process.env.DISPLAY) return false;
    if (!(await which("xdotool"))) return false;
    if (!(await which("scrot")) && !(await which("maim"))) return false;
    return true;
  }

  async screenshot(targetPath?: string): Promise<Screenshot> {
    await mkdir(this.screenshotDir, { recursive: true });
    const path = targetPath ?? join(this.screenshotDir, `screenshot-${Date.now()}.png`);
    const useScrot = await which("scrot");
    const tool = useScrot ? "scrot" : "maim";
    const args = useScrot ? ["-z", "-o", path] : ["--quality", "8", path];
    const result = await run(tool, args, { timeoutMs: 8_000 });
    if (result.exitCode !== 0) {
      throw new Error(`screenshot failed (${tool}): ${result.stderr.trim() || `exit ${result.exitCode}`}`);
    }
    const dims = await this.measure();
    await stat(path); // throws if not present
    return { path, width: dims.width, height: dims.height, mimeType: "image/png" };
  }

  async moveMouse(x: number, y: number): Promise<void> {
    await this.xdotool(["mousemove", "--sync", String(x), String(y)]);
  }

  async click(x: number, y: number, options: MouseButtonOptions = {}): Promise<void> {
    const button = mouseButton(options.button);
    await this.xdotool(["mousemove", "--sync", String(x), String(y)]);
    if (options.doubleClick) {
      await this.xdotool(["click", "--repeat", "2", "--delay", "60", String(button)]);
    } else {
      await this.xdotool(["click", String(button)]);
    }
  }

  async type(text: string): Promise<void> {
    if (text.length === 0) return;
    await this.xdotool(["type", "--delay", "12", "--", text]);
  }

  async key(combination: string, options: KeyOptions = {}): Promise<void> {
    const tokens = [...(options.modifiers ?? []), combination]
      .filter(Boolean)
      .map((token) => normaliseKeyToken(token));
    const xdoKey = tokens.join("+");
    await this.xdotool(["key", "--", xdoKey]);
  }

  async scroll(x: number, y: number, direction: ScrollDirection, amount = 3): Promise<void> {
    await this.xdotool(["mousemove", "--sync", String(x), String(y)]);
    const button =
      direction === "up" ? 4 : direction === "down" ? 5 : direction === "left" ? 6 : 7;
    for (let i = 0; i < amount; i += 1) {
      await this.xdotool(["click", String(button)]);
    }
  }

  private async measure(): Promise<{ width: number; height: number }> {
    const result = await run("xdotool", ["getdisplaygeometry"]);
    if (result.exitCode === 0) {
      const [w, h] = result.stdout.trim().split(/\s+/).map(Number);
      if (Number.isFinite(w) && Number.isFinite(h)) return { width: w, height: h };
    }
    return { width: 0, height: 0 };
  }

  private async xdotool(args: string[]): Promise<void> {
    const result = await run("xdotool", args, { timeoutMs: 6_000 });
    if (result.exitCode !== 0) {
      throw new Error(`xdotool ${args.join(" ")} failed: ${result.stderr.trim() || `exit ${result.exitCode}`}`);
    }
  }
}

function mouseButton(button?: "left" | "right" | "middle"): number {
  switch (button) {
    case "right":
      return 3;
    case "middle":
      return 2;
    default:
      return 1;
  }
}

function normaliseKeyToken(token: string): string {
  const lower = token.toLowerCase();
  switch (lower) {
    case "ctrl":
    case "control":
      return "ctrl";
    case "shift":
      return "shift";
    case "alt":
      return "alt";
    case "meta":
    case "super":
    case "win":
      return "super";
    default:
      return token;
  }
}
