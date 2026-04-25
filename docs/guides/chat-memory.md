# Long-term chat memory

Rexa is an assistant, not just a task runner. Every chat turn —
regardless of which surface the user reached you from (CLI, Telegram,
WhatsApp QR, web) — is persisted to the same memory storage and
retrieved on every future turn.

## How it works

Each call to `Orchestrator.handle(message, { userId })`:

1. **Persists the user turn** under `scope = "chat:{userId}"` with type
   `user-turn` before generating any reply. Even if generation fails,
   the input is preserved.
2. **Pulls the recent N turns** for that user (default 10, halved when
   token-saver is on) chronologically and injects them into the model
   prompt as a `Recent conversation` block.
3. **Pulls cross-scope long-term memory** via the existing
   `summarize(query)` semantic search (token-overlap + recency
   weighting) so the model also sees relevant facts from previous
   tasks.
4. **Persists the assistant reply** under the same scope as
   `assistant-turn`.

## Storage

The default `JsonStorage` already persists chat turns to
`~/.rexa/data/store.json`. For higher volume:

- **SQLite** (`storage.defaultStorage = "sqlite"`): drop-in, no schema
  changes needed.
- **Postgres** (`storage.defaultStorage = "postgres"`): set
  `POSTGRES_URL` and switch storage adapter.

Per-user retention is unbounded by default. To prune, run a periodic
maintenance task that deletes records with
`scope = "chat:{userId}" AND createdAt < cutoff`.

## Multi-user isolation

`chat:{userId}` keeps each conversant's history separate. Two users on
the same WhatsApp/Telegram bot can't see each other's history.

## Tuning

| Knob                                    | Default | Effect |
|-----------------------------------------|---------|--------|
| `app.tokenSaver.maxHistoryTurns`        | 6       | History injected when token-saver is ON. |
| (planned) `app.chat.history.maxTurns`   | 10      | Standard mode; not yet exposed — edit `orchestrator.ts`. |
| `app.tokenSaver.enabled`                | false   | Halves the recent-turns budget. |

## Privacy

Chat content lives next to your other agent state (tasks, telemetry,
memory). Ensure storage is on an encrypted volume — and enable the
encrypted vault (`docs/guides/secret-vault.md` once written) for
secrets so they never leak into chat memory.
