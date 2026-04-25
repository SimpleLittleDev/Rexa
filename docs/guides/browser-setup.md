# Browser Setup

Browser priority:

1. Playwright Chromium.
2. Termux local Chromium/proot adapter.
3. Remote browser endpoint.
4. Limited mode.

Linux/Windows:

```bash
npx playwright install chromium
```

Termux:
- Try installed `chromium` first.
- If full GUI is unavailable, use remote browser mode:

```bash
export REXA_REMOTE_BROWSER_URL=http://127.0.0.1:3000/browser
```

Supported browser actions:
- open URL
- screenshot
- read DOM
- read visible text
- move pointer
- click coordinates
- click selector/text
- type/fill
- upload file
- scroll
- wait navigation

Rexa must ask confirmation before public submit/publish/upload actions.

## Agent-Style Browser Updates

When `browserAgent.screenshotUpdates` is enabled in `config/app.config.json`, browser tool actions emit updates:

```text
Browser: Membuka browser: https://example.com
Browser: Mouse dipindahkan ke 120, 240.
Browser: Klik mouse di 120, 240.
```

If the active chat provider supports images, Rexa sends the screenshot too. Otherwise it sends the screenshot file path.

Config:

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
