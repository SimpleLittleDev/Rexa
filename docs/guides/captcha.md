# CAPTCHA solver

Rexa's `BrowserTool` can solve CAPTCHAs autonomously. Detection and
solver-provider routing happen automatically; you only need API keys.

## Supported challenges

| Kind                       | Detection                                        | Solver path |
|----------------------------|--------------------------------------------------|-------------|
| reCAPTCHA v2               | `.g-recaptcha`, `iframe[src*="recaptcha"]`        | 2Captcha / Anti-Captcha / CapSolver |
| reCAPTCHA v3               | `script[src*="recaptcha/api.js?render="]`        | same, requires `action` + `minScore` |
| hCaptcha                   | `.h-captcha`, `iframe[src*="hcaptcha"]`           | same |
| Cloudflare Turnstile       | `.cf-turnstile`, `iframe[src*="challenges.cloudflare.com"]` | same |
| Image captcha (custom)     | passed selector pointing at `<img>`               | Vision-LLM fallback |

## Configure providers

Set any of these env vars (multiple ⇒ tried in `config.captcha.providers`
order):

```bash
export TWOCAPTCHA_API_KEY=...
export ANTICAPTCHA_API_KEY=...
export CAPSOLVER_API_KEY=...
```

Disable globally via `app.captcha.enabled = false`.

## Programmatic use

```ts
const result = await browserTool.solveCaptcha();           // auto-detect
const result = await browserTool.solveCaptcha({ kind: "recaptcha-v3", action: "submit", minScore: 0.7 });
const result = await browserTool.solveCaptcha({ selector: "img.captcha" });

if (result.ok) {
  console.log(result.value.solution);
}
```

The solver:

1. Inspects the live DOM (or the explicit selector / kind override).
2. Walks `app.captcha.providers` in order, returning the first success.
3. Injects the solution back into the page (sets `g-recaptcha-response`,
   `h-captcha-response`, `cf-turnstile-response`, or fires the JS
   callback) so the form is submittable.
4. Records a structured event for telemetry.

## Fallback chain (efficiency-first)

Even without paid API keys, the solver always tries to make progress:

1. **Pre-flight filter** — providers whose env-var key is missing are
   skipped entirely so we never waste a round-trip.
2. **Vision-LLM (free)** — for image/text captchas, the configured LLM
   router is used first via the `vision`/`general`/`reasoning` roles.
   This works out of the box if you have an OpenAI / Anthropic /
   Gemini key configured for the agent itself — no extra captcha-only
   subscription needed.
3. **Paid providers** — `2Captcha`, `Anti-Captcha`, `CapSolver` (in the
   order listed in `app.captcha.providers`) for any kind they support.
4. **Audio fallback** — for reCAPTCHA v2 with `audioBase64` available,
   the solver transcribes via OpenAI Whisper.
5. **Interactive prompt** — if a `interactiveFallback` is wired (e.g.
   the CLI surface, Telegram, WhatsApp), the solver asks the active
   human to paste a token. Returns cleanly without blocking when no
   human is available so downstream agents can decide to retry later.

`createBrowserTool` automatically wires the `RouterVisionSolver`
(LLM-router-backed) and the `WhisperAudioSolver` (when
`OPENAI_API_KEY` is present). You only need to install paid keys if
your traffic includes reCAPTCHA / hCaptcha / Turnstile — image and
text captchas are solved for free via your existing LLM budget.

## Programmatic injection of an interactive solver

```ts
import { createBrowserTool } from "rexa";
import type { InteractiveSolver, CaptchaTask } from "rexa";

const interactive: InteractiveSolver = {
  async prompt(_task: CaptchaTask, message: string) {
    const answer = await ui.askUser(message);
    return answer ?? "";
  },
};

const browser = createBrowserTool(config, { router, interactiveFallback: interactive });
```
