# Computer-use (OS automation)

Beyond the browser, Rexa can drive the host operating system directly:
take screenshots, move the mouse, click, type, send keys, and scroll.
This unlocks agent loops similar to Anthropic's Computer Use and
OpenAI's Operator — let a vision-capable model see the screen, decide,
and act.

## Backends

| Backend         | Platform | Tools used                                  |
|-----------------|----------|---------------------------------------------|
| `linux-xdotool` | Linux    | `xdotool` + `scrot` or `maim`               |
| `macos`         | macOS    | `screencapture` + `cliclick` (or AppleScript) |
| `windows`       | Windows  | PowerShell + `System.Windows.Forms.SendKeys` |
| `android-adb`   | any      | `adb shell input` + `adb exec-out screencap` |
| `none`          | any      | no-op fallback that throws structured errors |

Rexa auto-picks the first available backend at startup. Override with
`config/app.config.json`:

```json
{
  "computerUse": {
    "enabled": true,
    "backend": "auto",
    "screenshotDir": "data/screenshots",
    "androidSerialEnv": "ANDROID_SERIAL"
  }
}
```

## CLI

```bash
rexa computer info                  # show active + available backends
rexa computer screenshot            # save full-screen PNG, print path
rexa computer screenshot --out /tmp/now.png
rexa computer click 640 360         # left-click at coordinates
rexa computer type "hello world"    # type into focused window
rexa computer key Return            # press a single key
```

## Tool handlers

When wired into the orchestrator's tool-loop, computer-use exposes
these tools to the model:

- `os.screenshot({ path?, returnBase64? })` — capture, optionally
  return a `data:image/png;base64,...` URI for a vision LLM.
- `os.click({ x, y, button?, doubleClick? })`
- `os.move({ x, y })`
- `os.type({ text })`
- `os.key({ key, modifiers? })`
- `os.scroll({ x, y, direction, amount? })`

Wire them into your dispatcher with `buildComputerUseTools(manager)`.

## Permissions

- **macOS** prompts for Accessibility permission the first time you
  click/type. Grant it to your terminal app under
  *System Settings → Privacy & Security → Accessibility*.
- **Linux** requires an X11 `DISPLAY` (Wayland not yet supported via
  xdotool — Wayland adapter is on the roadmap).
- **Windows** requires PowerShell (always present on supported
  versions).
- **Android** requires `adb` on `$PATH` and a connected device with USB
  debugging enabled.

## Safety

Computer-use is a sharp tool. Pair it with the existing permission
gate (`permissionMode: "balanced"` or `"strict"` in
`config/app.config.json`) so destructive actions still require
confirmation. Consider using token-saver and a vision LLM with a low
budget when running long autonomous loops to keep cost predictable.
