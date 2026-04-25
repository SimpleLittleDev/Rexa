# Provider Setup

Rexa reads provider and model names from `config/models.config.json`. Do not hardcode model names in source code.

Provider status:
- `codex-cli`: requires `codex` binary and completed manual auth.
- `claude-code`: requires `claude` binary and completed manual auth.
- `openai`: requires `OPENAI_API_KEY`.
- `anthropic`: requires `ANTHROPIC_API_KEY`.
- `gemini`: requires `GEMINI_API_KEY`.
- `openrouter`: requires `OPENROUTER_API_KEY`.
- `ollama`: requires local Ollama server.
- `mock`: always available for local tests and fallback.

Run:

```bash
npm run doctor
```

To test fallback without sending prompts to CLI providers:

```bash
REXA_DISABLE_CLI_LLM=1 npm run demo
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

Rexa never asks for raw passwords and never bypasses OAuth/browser auth.
