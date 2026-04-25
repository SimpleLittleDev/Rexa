# Token-saver mode

Token-saver trades raw model power for cost. Enable it when you don't need
deep reasoning and want predictable, low-latency responses.

## Toggle

Three ways, in increasing precedence:

1. Config: `app.tokenSaver.enabled = true` in `config/app.config.json`.
2. Env: `REXA_TOKEN_SAVER=1`.
3. Per-invocation flag (where supported): `--token-saver`.

## What changes

| Behaviour          | Default                | Token-saver |
|--------------------|------------------------|-------------|
| Role               | `recommendedRole`      | `cheap` (gpt-4.1-mini, claude-haiku, etc.) |
| Planner steps      | up to 8                | capped at `tokenSaver.maxPlannerSteps` (3) |
| History turns      | full                   | last `tokenSaver.maxHistoryTurns` (6) |
| System prompt      | `SYSTEM_PROMPT`        | `SYSTEM_PROMPT_LITE` (1–3 sentence bias) |
| Streaming          | on                     | off (single buffered response) |
| Tool-calling       | always offered         | suppressed for simple intents |

The exact thresholds live under `app.tokenSaver` in
`src/app/config.ts`.

## When to use

- Quick clarifying questions / single-turn factual lookups.
- Bulk worker tasks (the daemon defaults to **on** for `agent-task` items
  unless you override per-task).
- CI / pre-commit assistant runs where you care about predictability.
- Constrained networks (slow streaming hurts UX more than helps).

## When NOT to use

- Multi-step browser automation that benefits from chain-of-thought.
- Long planner sessions where you want the agent to reason about edge
  cases.
- Tool-heavy workflows (CAPTCHA, scraping) — keep `cheap` role only as a
  fallback, not primary.
