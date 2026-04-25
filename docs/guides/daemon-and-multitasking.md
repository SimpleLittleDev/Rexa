# Background daemon & hard multitasking

Rexa ships with two related runtime systems:

1. **`TaskScheduler`** — in-process concurrent worker pool used by the agent
   itself. Lets a single `rexa chat` session run multiple sub-agents in
   parallel with priority + dependency support.
2. **Background daemon** — a long-lived `node` process spawned by
   `rexa daemon start`. Persists tasks to JSON, supports periodic watches
   and cron-style schedules, survives across `rexa` invocations.

## TaskScheduler

```ts
import { TaskScheduler } from "rexa/scheduler/task-scheduler";

const scheduler = new TaskScheduler({ concurrency: 4, defaultTimeoutMs: 60_000 });

const a = scheduler.enqueue({ run: () => doThing(), priority: 5 });
const b = scheduler.enqueue({ run: () => doDependent(), dependencies: [a.id] });

await scheduler.drain();
```

Features:

- **Concurrency cap** — never more than `concurrency` tasks active at once.
- **Priority queue** — higher `priority` numbers run first, ties broken by
  enqueue order.
- **Dependencies** — a task stays `blocked` until all `dependencies` are
  `completed`. If any dep `failed` or was `cancelled`, the dependent is
  marked `failed` automatically.
- **Per-task timeouts + AbortSignal** — timeouts trigger a synthetic
  `abort()` so cancellable IO actually unwinds.
- **Retries** — set `maxRetries` to retry failures with no backoff (bring
  your own delay if you need one).

## Background daemon

```bash
# Start / stop / inspect
rexa daemon start
rexa daemon status
rexa daemon log         # tail -f the daemon log
rexa daemon stop

# Watch a URL every 30s for 5 hours, run `notify-send "$URL changed"` on diff
rexa watch https://api.example.com/health \
  --interval 30s \
  --duration 5h \
  --on-change "notify-send 'health endpoint changed'"

# Cron: every hour run a backup script
rexa schedule "0 * * * *" "/home/me/scripts/backup.sh"

# Inspect the queue
rexa task list
rexa task cancel dtask-abc
rexa task rm dtask-abc
```

The queue lives at `~/.rexa/data/daemon/tasks.json`. The PID + log live at
`~/.rexa/data/daemon/daemon.{pid,log}`.

### Task kinds

| Kind         | Payload          | Notes |
|--------------|------------------|-------|
| `watch`      | `{ url }`        | GET, hash body, run `onChange` shell command on hash diff. |
| `schedule`   | `{ command }`    | Run shell command; uses 5-field cron expression. |
| `command`    | `{ command }`    | One-shot delayed shell command. |
| `agent-task` | `{ message }`    | Spawn the agent runtime in-process and run the message. |

### Long-running monitoring

The daemon is purposely minimal — it just dispatches. For richer agent
monitoring (e.g. "watch this server for 5 hours and act when CPU spikes"),
queue an `agent-task` with `intervalMs` and let the agent itself decide
whether to escalate, page you on Telegram, restart a service, etc.
