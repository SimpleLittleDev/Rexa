import type {
  ComputerUseAdapter,
  KeyOptions,
  MouseButtonOptions,
  ScrollDirection,
  Screenshot,
} from "./computer-use-types";

/**
 * No-op adapter selected when no platform backend is available
 * (e.g. headless server with no DISPLAY, no xdotool, no ADB device).
 * Every method throws a structured error so callers can surface a
 * useful "computer-use unavailable here" message instead of silently
 * pretending to click.
 */
export class NoneComputerUseAdapter implements ComputerUseAdapter {
  readonly name = "none";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async screenshot(_targetPath?: string): Promise<Screenshot> {
    throw new Error("computer-use disabled: no backend available on this host");
  }

  async moveMouse(_x: number, _y: number): Promise<void> {
    throw new Error("computer-use disabled: no backend available on this host");
  }

  async click(_x: number, _y: number, _options?: MouseButtonOptions): Promise<void> {
    throw new Error("computer-use disabled: no backend available on this host");
  }

  async type(_text: string): Promise<void> {
    throw new Error("computer-use disabled: no backend available on this host");
  }

  async key(_combination: string, _options?: KeyOptions): Promise<void> {
    throw new Error("computer-use disabled: no backend available on this host");
  }

  async scroll(_x: number, _y: number, _direction: ScrollDirection, _amount?: number): Promise<void> {
    throw new Error("computer-use disabled: no backend available on this host");
  }
}
