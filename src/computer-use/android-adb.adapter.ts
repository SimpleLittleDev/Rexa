import { join } from "node:path";
import { writeFile, mkdir, stat } from "node:fs/promises";
import type {
  ComputerUseAdapter,
  KeyOptions,
  MouseButtonOptions,
  ScrollDirection,
  Screenshot,
} from "./computer-use-types";
import { run, which } from "./process-utils";

/**
 * Android backend driven by adb.
 *
 * - Screenshot: `adb exec-out screencap -p` returns a PNG over stdout.
 * - Tap: `adb shell input tap`.
 * - Long-press / drag: `adb shell input swipe x y x y duration`.
 * - Text: `adb shell input text` (escapes spaces to %s).
 * - Key: `adb shell input keyevent <KEYCODE>`.
 *
 * `androidSerial` selects a specific device when multiple are
 * connected.
 */
export class AndroidAdbAdapter implements ComputerUseAdapter {
  readonly name = "android-adb";

  constructor(
    private readonly screenshotDir: string,
    private readonly serial: string | undefined = process.env.ANDROID_SERIAL,
  ) {}

  async isAvailable(): Promise<boolean> {
    if (!(await which("adb"))) return false;
    const result = await this.adb(["devices"]);
    return /\bdevice\b/.test(result.stdout);
  }

  async screenshot(targetPath?: string): Promise<Screenshot> {
    await mkdir(this.screenshotDir, { recursive: true });
    const path = targetPath ?? join(this.screenshotDir, `screenshot-${Date.now()}.png`);
    const args = this.deviceArgs(["exec-out", "screencap", "-p"]);
    const result = await run("adb", args, { timeoutMs: 12_000 });
    if (result.exitCode !== 0) {
      throw new Error(`adb screencap failed: ${result.stderr.trim() || `exit ${result.exitCode}`}`);
    }
    await writeFile(path, Buffer.from(result.stdout, "binary"));
    await stat(path);
    return { path, width: 0, height: 0, mimeType: "image/png" };
  }

  async moveMouse(_x: number, _y: number): Promise<void> {
    // Android has no cursor concept — tap performs a discrete touch.
    return;
  }

  async click(x: number, y: number, options: MouseButtonOptions = {}): Promise<void> {
    if (options.doubleClick) {
      await this.adbInput(["tap", String(x), String(y)]);
      await this.adbInput(["tap", String(x), String(y)]);
      return;
    }
    await this.adbInput(["tap", String(x), String(y)]);
  }

  async type(text: string): Promise<void> {
    if (text.length === 0) return;
    const escaped = text.replace(/ /g, "%s").replace(/'/g, "\\'");
    await this.adbInput(["text", escaped]);
  }

  async key(combination: string, options: KeyOptions = {}): Promise<void> {
    // Modifiers aren't supported via `adb input keyevent`; we accept them
    // for API parity but ignore.
    void options;
    const code = androidKeyCode(combination);
    await this.adbInput(["keyevent", code]);
  }

  async scroll(x: number, y: number, direction: ScrollDirection, amount = 3): Promise<void> {
    const delta = 120 * amount;
    let x2 = x;
    let y2 = y;
    if (direction === "up") y2 = y + delta;
    else if (direction === "down") y2 = y - delta;
    else if (direction === "left") x2 = x + delta;
    else x2 = x - delta;
    await this.adbInput(["swipe", String(x), String(y), String(x2), String(y2), "300"]);
  }

  private deviceArgs(args: string[]): string[] {
    return this.serial ? ["-s", this.serial, ...args] : args;
  }

  private async adb(args: string[]) {
    return run("adb", this.deviceArgs(args), { timeoutMs: 8_000 });
  }

  private async adbInput(args: string[]): Promise<void> {
    const result = await this.adb(["shell", "input", ...args]);
    if (result.exitCode !== 0) {
      throw new Error(`adb input ${args.join(" ")} failed: ${result.stderr.trim() || `exit ${result.exitCode}`}`);
    }
  }
}

function androidKeyCode(name: string): string {
  // Accept either friendly names or raw KEYCODE_* identifiers.
  if (/^KEYCODE_/i.test(name)) return name.toUpperCase();
  switch (name.toLowerCase()) {
    case "back":
      return "KEYCODE_BACK";
    case "home":
      return "KEYCODE_HOME";
    case "menu":
      return "KEYCODE_MENU";
    case "enter":
    case "return":
      return "KEYCODE_ENTER";
    case "tab":
      return "KEYCODE_TAB";
    case "space":
      return "KEYCODE_SPACE";
    case "del":
    case "delete":
    case "backspace":
      return "KEYCODE_DEL";
    case "escape":
      return "KEYCODE_ESCAPE";
    case "up":
      return "KEYCODE_DPAD_UP";
    case "down":
      return "KEYCODE_DPAD_DOWN";
    case "left":
      return "KEYCODE_DPAD_LEFT";
    case "right":
      return "KEYCODE_DPAD_RIGHT";
    default:
      return "KEYCODE_" + name.toUpperCase();
  }
}
