# Architecture Notes

Rexa is split by boundary:

- `llm`: provider interfaces, routing, fallback.
- `agent`: main loop and task state.
- `subagents`: isolated worker instances and output contract.
- `tools`: browser, terminal, file, Gmail, Calendar.
- `storage`: replaceable persistence.
- `memory`: retrieval and summarization over storage.
- `security`: permission, confirmation, redaction, vault.
- `chat`: CLI, Telegram, REST/web, WebSocket interfaces.

The main loop does not directly trust sub-agent output. It validates status, risks, changed files, and recommended next step before continuing.
