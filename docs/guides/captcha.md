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

## Vision-LLM fallback

For image / text captchas with no external service available, pass a
`VisionLLMSolver` to `createBrowserTool`. The default implementation calls
the planner's `vision` role. Token cost is logged via telemetry like any
other LLM call.
