# Browser Setup

Rexa picks a browser adapter based on `browserMode` in `config/app.config.json`.

| mode | description |
| --- | --- |
| `auto` (default) | Detect chromium binary or fall back to Playwright managed install. |
| `chromium` | Use a local Chromium / Chrome / Edge binary via Playwright (full power). |
| `playwright` | Use Playwright's bundled chromium. |
| `remote-browser` | Talk to a remote browser HTTP endpoint via `REXA_REMOTE_BROWSER_URL`. |
| `limited` | No automation; agent reports a friendly error if a tool action is requested. |

## Linux / Windows / macOS

```bash
npm install playwright
npx playwright install chromium     # downloads a managed chromium
```

If you prefer using your system Chrome/Chromium:

```bash
export REXA_CHROMIUM_PATH=/usr/bin/google-chrome   # Linux
export REXA_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  # macOS
```

Rexa auto-detects common locations (`/usr/bin/chromium`, `google-chrome`, `Edge`) without setting any env var.

## Remote browser mode

For headless runners or constrained environments, expose a remote browser API and set:

```bash
export REXA_REMOTE_BROWSER_URL=http://127.0.0.1:3000/browser
```

## Browser actions

Available on `BrowserTool`:

- `open(url)` / `screenshot(path?)` / `getDom()` / `getVisibleText()`
- `moveMouse`, `click`, `clickBySelector`, `clickByText`
- `type`, `uploadFile`, `scroll`
- `waitForSelector`, `waitForText`, `evaluate`
- `pdf(path)`, `cookies()`, `setCookies(...)`
- `setViewport(w, h)`, `setUserAgent(ua)`
- `close()`

Public submit / publish / upload actions still pass the confirmation gate.

## Stealth & customization

`ChromiumAdapter` ships with default stealth tweaks (drops `navigator.webdriver`, fakes plugin/language hints, sets reasonable hardwareConcurrency).
You can pass options when constructing the adapter directly:

```ts
import { ChromiumAdapter } from "../tools/browser/chromium.adapter";

const browser = new ChromiumAdapter({
  headless: false,
  userDataDir: "data/browser-profile",
  userAgent: "Mozilla/5.0 (...)",
  viewport: { width: 1440, height: 900 },
  locale: "id-ID",
  timezoneId: "Asia/Jakarta",
  proxy: { server: "http://proxy:3128" },
  stealth: true,
});
```

## Agent-style updates

Set `browserAgent.screenshotUpdates: true` (default) and Rexa will emit progress + screenshots after each action to whichever chat surface is active.

```json
{
  "browserAgent": {
    "enabled": true,
    "pointerEnabled": true,
    "screenshotUpdates": true,
    "screenshotDir": "data/browser-screenshots",
    "updateAfterActions": ["open", "click", "moveMouse", "type", "scroll", "uploadFile"]
  }
}
```
