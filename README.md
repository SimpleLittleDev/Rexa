# Rexa

Rexa adalah fondasi awal Personal Autonomous AI Assistant: modular, adaptive, cross-platform, multi-provider, punya tool layer, memory, confirmation gate, dan runtime sub-agent.

MVP ini sudah runnable secara lokal. Rexa main agent dapat memakai `codex-cli` model `gpt-5.5`, lalu mendesain worker/sub-agent dinamis per task. Tidak ada preset worker default: nama, role, model, pekerjaan, tools, dan system prompt worker dibuat oleh main agent saat runtime.

## Arsitektur

```text
User
  -> Chat Provider (CLI / REST / Telegram / WebSocket)
  -> Rexa Main Agent
     -> Planner: intent, risk, plan
     -> Memory Manager: short/task/project/long-term retrieval
     -> LLM Router: provider + model from config, fallback if unavailable
     -> Permission + Confirmation Gate
     -> Tool Plugins: browser, terminal, file, gmail, calendar
     -> DynamicSubAgentDesigner: main agent proposes runtime workers
     -> SubAgentManager
        -> isolated worker instances generated for this task
     -> Validator + Observer + Audit Log
  -> Progress updates + final report
```

## Alur Sistem

```text
1. User memberi perintah natural language.
2. Rexa membaca memory relevan dan environment capability.
3. Planner menentukan intent, risk, tool, model role, dan perlu sub-agent atau tidak.
4. LLMRouter mengecek provider dari config.
5. Jika provider utama tidak ready, router mencoba fallback provider.
6. Jika task besar, main agent membuat JSON proposal worker dinamis.
7. Rexa memaksa provider worker sama dengan provider main agent, lalu spawn worker.
8. Sub-agent mengerjakan task kecil dan mengembalikan output contract standar.
9. Rexa memvalidasi output sub-agent, risiko, file berubah, dan kebutuhan test.
10. Tool action berisiko masuk confirmation gate.
11. Rexa memberi progress singkat dan laporan akhir.
```

## Struktur Folder

```text
src/
  app/                  bootstrap, config, REST server
  agent/                main loop, planner, executor, validator, risk, task state
  subagents/            manager, isolated sub-agent runtime, role prompts
  llm/                  provider interface, router, detector, providers
  tools/                browser, terminal, file, gmail, calendar
  chat/                 CLI, Telegram, web, WebSocket providers
  memory/               memory manager and memory scopes
  storage/              JSON, SQLite, Postgres, memory, vector adapters
  security/             permission, vault, sandbox, redaction, policy
  env/                  OS/runtime/browser/provider detection
  cli/                  setup wizard and TUI helpers
  logs/                 logger and audit log
  database/             schema and migrations
  frontend/dashboard/   optional dashboard workspace
config/                 active app/model/agent/storage config
tests/                  Vitest coverage for core runtime
docs/guides/            setup and architecture guides
```

## Package

```json
{
  "scripts": {
    "setup": "tsx src/index.ts setup",
    "chat": "tsx src/index.ts chat",
    "doctor": "tsx src/index.ts doctor",
    "demo": "tsx src/index.ts demo-flow",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

## Quick Start

```bash
npm install
npm run setup
npm run doctor
npm run demo
npm run chat
```

## Global Termux Command

This machine uses a durable wrapper at:

```bash
/data/data/com.termux/files/home/bin/rexa
```

The wrapper always enters `/data/data/com.termux/files/home/Rexa` first, then runs `dist/src/index.js` or falls back to `tsx src/index.ts`.

Use it from any folder:

```bash
rexa doctor
rexa chat
rexa telegram
rexa whatsapp
rexa ws
rexa web
rexa demo-flow
```

Chat provider setup details are in [docs/guides/chat-providers.md](docs/guides/chat-providers.md).

`rexa setup` is keyboard-first: use Up/Down to move rows, Left/Right to change values, Enter to save.
If Telegram is selected, setup immediately asks for the BotFather token and saves it to local `.env`.

Build and tests:

```bash
npm test
npm run typecheck
npm run build
```

## CLI Provider Requirements

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

Rexa only detects CLI availability and auth signals. It does not ask for passwords, bypass OAuth, or store raw CLI credentials.

If Codex is missing, `doctor` reports:

```text
Codex CLI belum terinstall. Install dulu dengan:
npm install -g @openai/codex

Setelah itu jalankan:
codex
```

If Claude Code is missing:

```text
Claude Code belum terinstall. Install dulu dengan:
npm install -g @anthropic-ai/claude-code

Setelah itu jalankan:
claude
```

## Dynamic Sub-Agent Runtime

`config/agents.config.json`:

```json
{
  "mainAgent": {
    "name": "Rexa",
    "role": "main-orchestrator",
    "provider": "codex-cli",
    "model": "gpt-5.5"
  },
  "subAgentPolicy": {
    "enabled": true,
    "sameProviderAsMain": true,
    "maxAgents": 3,
    "allowedTools": ["browser", "terminal", "file", "memory"]
  }
}
```

When a task is complex, Rexa asks the main model to return JSON like:

```json
{
  "shouldSpawn": true,
  "agents": [
    {
      "name": "SiteMapper",
      "role": "website-data-worker",
      "model": "gpt-5.4",
      "tools": ["browser", "file"],
      "systemPrompt": "You collect website data and return structured findings.",
      "task": "Open the target website, extract relevant data, and report findings to Rexa."
    }
  ]
}
```

Rexa ignores any provider in the proposal and forces the worker provider to match main agent provider when `sameProviderAsMain` is true.

`config/models.config.json` keeps fallback providers:

```json
{
  "roles": {
    "coding": {
      "provider": "codex-cli",
      "model": "gpt-5.4",
      "fallbackProviders": ["mock", "openai", "ollama"]
    },
    "fallback": {
      "provider": "mock",
      "model": "local-mock-fallback"
    }
  }
}
```

If a runtime worker cannot use the selected model/provider, Rexa records the failure and retries the role through `LLMRouter` fallback.

## Browser Flow Example

```ts
const browser = new BrowserTool();
await browser.open("https://example.com");
await browser.moveMouse(120, 240);
await browser.click(120, 240);
const text = await browser.getVisibleText();
```

Public actions such as publish, upload, submit, or email send must pass confirmation first.

## Termux

```bash
pkg update
pkg install nodejs
npm install
npm run setup
npm run doctor
npm run chat
```

Optional Codex/Claude providers:

```bash
npm install -g @openai/codex
codex
npm install -g @anthropic-ai/claude-code
claude
```

Browser mode on Termux:
- Use Playwright if available.
- Use local Chromium/proot if available.
- Fallback to Android intent/coordinate mode or remote browser.

## Linux

```bash
npm install
npx playwright install chromium
npm run setup
npm run chat
npm run api
```

SQLite is the preferred local storage mode. PostgreSQL is supported for VPS/multi-user mode via `DATABASE_URL`.

## Windows

```powershell
npm install
npx playwright install chromium
npm run setup
npm run chat
```

Rexa includes a PowerShell terminal adapter and path-safe file tool.

## Docker

```bash
docker compose up --build
```

Data persists in `./data`.

## Roadmap

Phase 1:
- CLI chat, setup wizard, LLM router, CLI detector, terminal/file/browser tools, JSON memory, logging, basic sub-agent runtime.

Phase 2:
- Real Codex/Claude prompt adapters per installed CLI version, Ollama/OpenRouter hardening, provider health cache.

Phase 3:
- Rich sub-agent queues, concurrent workers, budget accounting, task resume.

Phase 4:
- Telegram bot, WebSocket, React/Vite dashboard.

Phase 5:
- Vector memory ranking, episodic summaries, project memory, memory compaction.

Phase 6:
- Sandboxed terminal, encrypted vault hardening, audit exports, deployment profiles.
