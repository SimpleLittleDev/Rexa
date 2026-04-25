# Rexa

Rexa adalah Personal Autonomous AI Assistant: modular, adaptive, cross-platform, multi-provider, dengan tool layer, memory, confirmation gate, dan runtime sub-agent.

Main agent default berjalan di GPT-4.1 / Claude Sonnet 4 / Gemini 2.5 (configurable), dan mendesain worker/sub-agent dinamis per task. Tidak ada preset worker default — nama, role, model, pekerjaan, tools, dan system prompt worker dibuat oleh main agent saat runtime.

v0.2 highlights:
- High-quality interactive setup wizard (profile presets, system scan, post-setup launcher).
- Browser system upgrade: native Chromium adapter dengan stealth patches, multi-page, PDF export, cookies, evaluate, waitForSelector.
- LLM router: SSE streaming, retry + exponential backoff, circuit breaker per-provider, cost/token accounting.
- Planner detect 12 jenis intent (coding, browser, research, writing, analysis, math, creative, vision, data, terminal, file, scheduling).
- termux-chromium adapter dihapus, default browser mode `auto` memilih binary yang ada.

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
docs/guides/            setup and architecture guides
```

## Install

### Global command (recommended)

After install, the `rexa` command is on your PATH everywhere — no `npm run …` needed.

**Linux / macOS / Termux** (one-liner):

```bash
curl -fsSL https://raw.githubusercontent.com/SimpleLittleDev/Rexa/main/scripts/install.sh | bash
```

**Windows PowerShell** (one-liner):

```powershell
iwr -useb https://raw.githubusercontent.com/SimpleLittleDev/Rexa/main/scripts/install.ps1 | iex
```

**From a clone (any platform)**:

```bash
git clone https://github.com/SimpleLittleDev/Rexa.git ~/.rexa
cd ~/.rexa
npm install
npm run build
npm link        # registers `rexa` globally
```

**From npm (once published)**:

```bash
npm install -g rexa
```

The installer drops the source at `~/.rexa` (Linux/macOS/Termux) or `%USERPROFILE%\.rexa` (Windows). Override with `REXA_HOME=/custom/path` before running the installer.

### Run from anywhere

```bash
rexa setup     # interactive wizard (profile presets, system scan, secrets)
rexa doctor    # verify environment + providers + API keys
rexa chat      # CLI chat
rexa telegram  # Telegram bot
rexa whatsapp  # WhatsApp Cloud API webhook
rexa ws        # WebSocket chat
rexa web       # localhost web chat
rexa api       # localhost REST API
rexa demo      # main-agent + sub-agent demo
rexa help      # full help screen
```

When run outside the Rexa source folder, Rexa reads/writes config in `$REXA_HOME` (default `~/.rexa`). Override per-shell:

```bash
export REXA_HOME=/path/to/your/rexa-config
```

### Optional power-ups

```bash
npx playwright install chromium    # full browser automation (or set REXA_CHROMIUM_PATH)
npm install -g @openai/codex       # codex-cli provider
npm install -g @anthropic-ai/claude-code  # claude-code provider
```

### Dev mode (work on Rexa itself)

```bash
git clone https://github.com/SimpleLittleDev/Rexa.git
cd Rexa
npm install
npm run dev help    # all commands available without global install
npm run setup
```

`rexa setup` is keyboard-first: ↑/↓ pindah baris, ←/→ ubah nilai, Enter simpan, q batal. Wizard menampilkan profile presets (developer, researcher, power-user, minimal, custom), system scan, dan post-setup launcher (lanjut langsung ke chat).

## API Keys & CLI Providers

Rexa supports multiple LLM providers; configure whichever you want to use.

API keys (set in `.env`):

```bash
OPENAI_API_KEY=sk-...           # gpt-4.1, gpt-4.1-mini, gpt-4o
ANTHROPIC_API_KEY=sk-ant-...    # claude-sonnet-4, claude-opus-4
OPENROUTER_API_KEY=...          # any OpenRouter model
GEMINI_API_KEY=...              # gemini-2.5-pro/flash
```

Optional CLI providers (auto-detected by `npm run doctor`):

```bash
npm install -g @openai/codex && codex
npm install -g @anthropic-ai/claude-code && claude
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
    "provider": "openai",
    "model": "gpt-4.1"
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
      "model": "gpt-4.1-mini",
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
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514",
      "fallbackProviders": ["openai", "openrouter", "mock"]
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

## Browser System

Default `browserMode` is `auto`, which uses the new `ChromiumAdapter` powered by Playwright + a local Chromium/Chrome binary (auto-detected) and falls back to the Playwright-managed binary when the system one is missing.

Features available on every browser action:
- Stealth patches (`navigator.webdriver`, plugin/language spoofing, hardware hints).
- Configurable user-agent, viewport, locale, timezone, device scale factor, proxy.
- Multi-page contexts, cookies API, network options, downloads, PDF export, `evaluate()` for arbitrary scripts, `waitForSelector` / `waitForText` helpers.
- Optional persistent profile via `userDataDir`, `REXA_CHROMIUM_PATH` env override.

Supported `browserMode` values: `auto`, `chromium`, `playwright`, `remote-browser`, `limited`.

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
