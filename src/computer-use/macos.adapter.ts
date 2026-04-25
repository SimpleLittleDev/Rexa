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
 * macOS backend.
 *
 * - `screencapture` is built-in; captures the entire display(s).
 * - Mouse clicks/movement use `cliclick` when available, else fall
 *   back to AppleScript via osascript.
 * - Typing uses `osascript` with `tell application "System Events"`.
 *
 * The first time you use this adapter macOS will prompt for
 * Accessibility permission for the parent terminal application — the
 * user has to grant it manually in System Settings.
 */
export class MacOSAdapter implements ComputerUseAdapter {
  readonly name = "macos";

  constructor(private readonly screenshotDir: string) {}

  async isAvailable(): Promise<boolean> {
    return process.platform === "darwin";
  }

  async screenshot(targetPath?: string): Promise<Screenshot> {
    await mkdir(this.screenshotDir, { recursive: true });
    const path = targetPath ?? join(this.screenshotDir, `screenshot-${Date.now()}.png`);
    const result = await run("screencapture", ["-x", path], { timeoutMs: 8_000 });
    if (result.exitCode !== 0) {
      throw new Error(`screencapture failed: ${result.stderr.trim() || `exit ${result.exitCode}`}`);
    }
    await stat(path);
    return { path, width: 0, height: 0, mimeType: "image/png" };
  }

  async moveMouse(x: number, y: number): Promise<void> {
    if (await which("cliclick")) {
      await this.assertOk("cliclick", ["m:" + x + "," + y]);
      return;
    }
    // AppleScript fallback (slower, less precise).
    const script = `tell application "System Events" to set the mouse location to {${x}, ${y}}`;
    await this.osa(script);
  }

  async click(x: number, y: number, options: MouseButtonOptions = {}): Promise<void> {
    if (await which("cliclick")) {
      const action = options.doubleClick ? "dc" : options.button === "right" ? "rc" : "c";
      await this.assertOk("cliclick", [`${action}:${x},${y}`]);
      return;
    }
    // AppleScript click — left-click only; double-click handled via two clicks.
    const ascript = `tell application "System Events" to click at {${x}, ${y}}`;
    await this.osa(ascript);
    if (options.doubleClick) await this.osa(ascript);
  }

  async type(text: string): Promise<void> {
    if (text.length === 0) return;
    const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    await this.osa(`tell application "System Events" to keystroke "${escaped}"`);
  }

  async key(combination: string, options: KeyOptions = {}): Promise<void> {
    const modifiers = (options.modifiers ?? []).map(modifierName).filter(Boolean);
    const usingClause = modifiers.length > 0
      ? ` using {${modifiers.map((m) => `${m} down`).join(", ")}}`
      : "";
    const keyCode = appleKeyCode(combination);
    if (keyCode !== null) {
      await this.osa(`tell application "System Events" to key code ${keyCode}${usingClause}`);
      return;
    }
    const escaped = combination.replace(/"/g, '\\"');
    await this.osa(`tell application "System Events" to keystroke "${escaped}"${usingClause}`);
  }

  async scroll(x: number, y: number, direction: ScrollDirection, amount = 3): Promise<void> {
    await this.moveMouse(x, y);
    if (await which("cliclick")) {
      const flag = direction === "up" || direction === "left" ? "+" : "-";
      const axis = direction === "up" || direction === "down" ? "v" : "h";
      await this.assertOk("cliclick", [`s${axis}:${flag}${amount}`]);
    }
  }

  private async osa(script: string): Promise<void> {
    await this.assertOk("osascript", ["-e", script]);
  }

  private async assertOk(command: string, args: string[]): Promise<void> {
    const result = await run(command, args, { timeoutMs: 8_000 });
    if (result.exitCode !== 0) {
      throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr.trim() || `exit ${result.exitCode}`}`);
    }
  }
}

function modifierName(mod: string): string | null {
  switch (mod) {
    case "ctrl":
      return "control";
    case "shift":
      return "shift";
    case "alt":
      return "option";
    case "meta":
    case "super":
      return "command";
    default:
      return null;
  }
}

function appleKeyCode(name: string): number | null {
  switch (name.toLowerCase()) {
    case "return":
    case "enter":
      return 36;
    case "tab":
      return 48;
    case "escape":
    case "esc":
      return 53;
    case "delete":
    case "backspace":
      return 51;
    case "space":
      return 49;
    case "left":
      return 123;
    case "right":
      return 124;
    case "down":
      return 125;
    case "up":
      return 126;
    default:
      return null;
  }
}
