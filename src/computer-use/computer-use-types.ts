export interface Screenshot {
  /** Absolute path on disk where the screenshot was written. */
  path: string;
  /** Image width in pixels. */
  width: number;
  /** Image height in pixels. */
  height: number;
  /** Mime type, typically image/png. */
  mimeType: string;
}

export interface MouseButtonOptions {
  button?: "left" | "right" | "middle";
  doubleClick?: boolean;
}

export type ModifierKey = "shift" | "ctrl" | "alt" | "meta" | "super";

export interface KeyOptions {
  modifiers?: ModifierKey[];
}

export type ScrollDirection = "up" | "down" | "left" | "right";

export interface ComputerUseAdapter {
  readonly name: string;
  /** Quick check whether this backend can be used on the current host. */
  isAvailable(): Promise<boolean>;
  /** Capture full-screen (or all displays) into a PNG. */
  screenshot(targetPath?: string): Promise<Screenshot>;
  /** Move the cursor to absolute (x, y) in screen coordinates. */
  moveMouse(x: number, y: number): Promise<void>;
  /** Click at absolute (x, y); supports left/right/middle and double-click. */
  click(x: number, y: number, options?: MouseButtonOptions): Promise<void>;
  /** Type literal text at the current focus. */
  type(text: string): Promise<void>;
  /** Press a keyboard key (e.g. "Return", "Escape", "ctrl+c"). */
  key(combination: string, options?: KeyOptions): Promise<void>;
  /** Scroll the wheel at (x, y) in the given direction by `amount` ticks. */
  scroll(x: number, y: number, direction: ScrollDirection, amount?: number): Promise<void>;
}

export type ComputerUseBackendName = "auto" | "linux-xdotool" | "macos" | "windows" | "android-adb" | "none";

export interface ComputerUseConfig {
  enabled: boolean;
  backend: ComputerUseBackendName;
  /** Where to write screenshots (defaults to <REXA_HOME>/data/screenshots). */
  screenshotDir: string;
  /** ADB device serial when backend is android-adb. */
  androidSerial?: string;
}
