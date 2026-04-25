# Termux Setup

```bash
pkg update
pkg install nodejs
cd /data/data/com.termux/files/home/Rexa
npm install
npm run setup
npm run doctor
npm run chat
```

Codex CLI:

```bash
npm install -g @openai/codex
codex
```

Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
claude
```

Storage:
- JSON is the safest default on Termux.
- SQLite can be enabled after installing a compatible SQLite package and `better-sqlite3`.

Browser:
- Prefer Playwright if Chromium works.
- Otherwise use Termux/Android fallback or remote browser mode.
