# Troubleshooting

Run `npm run doctor` first — it surfaces missing CLI tools, API keys, and browser readiness.

## API keys

```bash
echo "OPENAI_API_KEY=sk-..." >> .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

## CLI providers

```bash
npm install -g @openai/codex && codex
npm install -g @anthropic-ai/claude-code && claude
```

## Browser missing

```bash
npm install playwright
npx playwright install chromium
```

Or point Rexa at your system Chrome/Chromium:

```bash
export REXA_CHROMIUM_PATH=/usr/bin/google-chrome
```

## SQLite / Postgres

```bash
npm install better-sqlite3       # local SQLite
npm install pg                   # Postgres
export DATABASE_URL=postgres://user:pass@host:5432/rexa
```

## Provider keeps failing

The router has a circuit breaker. After 3 consecutive failures, a provider is paused for 30s. Wait, or restart the process. To force a different provider in the meantime, edit `config/models.config.json` and switch the role's `provider` / `fallbackProviders`.
