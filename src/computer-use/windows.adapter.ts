import { join } from "node:path";
import { mkdir, stat } from "node:fs/promises";
import type {
  ComputerUseAdapter,
  KeyOptions,
  MouseButtonOptions,
  ScrollDirection,
  Screenshot,
} from "./computer-use-types";
import { run } from "./process-utils";

/**
 * Windows backend that drives the desktop via PowerShell + WinAPI
 * P/Invoke. We intentionally avoid native node addons so the adapter
 * works on any Windows machine that has PowerShell 5+ (i.e. any
 * supported Windows version).
 *
 * Screenshots: System.Drawing.Bitmap + Graphics.CopyFromScreen.
 * Mouse / keyboard: user32!mouse_event + SendInput via System.Windows.Forms.SendKeys.
 */
export class WindowsAdapter implements ComputerUseAdapter {
  readonly name = "windows";

  constructor(private readonly screenshotDir: string) {}

  async isAvailable(): Promise<boolean> {
    return process.platform === "win32";
  }

  async screenshot(targetPath?: string): Promise<Screenshot> {
    await mkdir(this.screenshotDir, { recursive: true });
    const path = targetPath ?? join(this.screenshotDir, `screenshot-${Date.now()}.png`);
    const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save("${escapePs(path)}", [System.Drawing.Imaging.ImageFormat]::Png)
"$($bounds.Width),$($bounds.Height)"
`;
    const result = await this.ps(script);
    const [w, h] = result.stdout.trim().split(",").map(Number);
    await stat(path);
    return {
      path,
      width: Number.isFinite(w) ? w : 0,
      height: Number.isFinite(h) ? h : 0,
      mimeType: "image/png",
    };
  }

  async moveMouse(x: number, y: number): Promise<void> {
    await this.ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`);
  }

  async click(x: number, y: number, options: MouseButtonOptions = {}): Promise<void> {
    const button = options.button ?? "left";
    const downFlag = button === "right" ? "0x0008" : button === "middle" ? "0x0020" : "0x0002";
    const upFlag = button === "right" ? "0x0010" : button === "middle" ? "0x0040" : "0x0004";
    const repeat = options.doubleClick ? 2 : 1;
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
Add-Type -MemberDefinition '[DllImport("user32.dll", CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, IntPtr dwExtraInfo);' -Name 'U32' -Namespace 'W32'
for ($i = 0; $i -lt ${repeat}; $i++) {
  [W32.U32]::mouse_event(${downFlag}, 0, 0, 0, [IntPtr]::Zero)
  [W32.U32]::mouse_event(${upFlag}, 0, 0, 0, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 60
}
`;
    await this.ps(script);
  }

  async type(text: string): Promise<void> {
    if (text.length === 0) return;
    const escaped = text.replace(/`/g, "``").replace(/'/g, "''");
    await this.ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`);
  }

  async key(combination: string, options: KeyOptions = {}): Promise<void> {
    // SendKeys uses ^ + % notation for Ctrl/Shift/Alt. Map our modifiers.
    const modifierStr = (options.modifiers ?? [])
      .map((m) => (m === "ctrl" ? "^" : m === "shift" ? "+" : m === "alt" ? "%" : ""))
      .join("");
    const keyName = combination.length === 1 ? combination : `{${combination.toUpperCase()}}`;
    const seq = `${modifierStr}${keyName}`.replace(/'/g, "''");
    await this.ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${seq}')`);
  }

  async scroll(x: number, y: number, direction: ScrollDirection, amount = 3): Promise<void> {
    const delta = direction === "up" ? amount * 120 : direction === "down" ? -amount * 120 : 0;
    if (delta === 0) return; // horizontal scroll unsupported via mouse_event
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
Add-Type -MemberDefinition '[DllImport("user32.dll", CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, IntPtr dwExtraInfo);' -Name 'U32S' -Namespace 'W32'
[W32.U32S]::mouse_event(0x0800, 0, 0, ${delta}, [IntPtr]::Zero)
`;
    await this.ps(script);
  }

  private async ps(script: string) {
    const result = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      timeoutMs: 12_000,
    });
    if (result.exitCode !== 0) {
      throw new Error(`powershell failed: ${result.stderr.trim() || `exit ${result.exitCode}`}`);
    }
    return result;
  }
}

function escapePs(value: string): string {
  return value.replace(/`/g, "``").replace(/"/g, '`"');
}
