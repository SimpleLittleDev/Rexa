# Troubleshooting

Codex missing:

```bash
npm install -g @openai/codex
codex
npm run doctor
```

Claude missing:

```bash
npm install -g @anthropic-ai/claude-code
claude
npm run doctor
```

Playwright missing:

```bash
npm install playwright
npx playwright install chromium
```

SQLite package missing:

```bash
npm install better-sqlite3
```

Postgres package missing:

```bash
npm install pg
export DATABASE_URL=postgres://...
```

Provider unavailable:
- Check env key or CLI login.
- Confirm model exists in provider account.
- Keep `fallbackProviders` configured.
