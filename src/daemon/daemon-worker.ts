import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { resolveRexaHome } from "../app/paths";
import { loadConfig } from "../app/config";
import { TaskQueue, type DaemonTask } from "./task-queue";
import { TaskScheduler } from "../scheduler/task-scheduler";
import { parseCron, nextRun } from "./cron";
import { logger } from "../logs/logger";

/**
 * Daemon entrypoint.
 *
 * Runs forever, polling the persistent task queue every `heartbeatMs` and
 * dispatching due work into a TaskScheduler. Three task kinds are supported:
 *
 * - `watch`: periodically GET a URL and run `onChange` if the response hash
 *   changes.
 * - `schedule`: run a shell command on a cron expression.
 * - `command`: run a shell command once (delayed by `nextRunAt`).
 * - `agent-task`: send a message to the in-process Rexa agent runtime.
 *
 * Exits cleanly on SIGTERM / SIGINT.
 */
export async function startDaemonWorker(): Promise<void> {
  const home = resolveRexaHome();
  const bundle = await loadConfig(home);
  const queuePath = bundle.app.daemon.queuePath.startsWith("/")
    ? bundle.app.daemon.queuePath
    : join(home, bundle.app.daemon.queuePath);
  const logPath = join(home, bundle.app.daemon.runtimeDir, "daemon.log");
  await mkdir(dirname(logPath), { recursive: true });

  const queue = new TaskQueue(queuePath);
  await queue.load();

  const scheduler = new TaskScheduler({
    concurrency: bundle.app.multitasking.concurrency,
    defaultTimeoutMs: bundle.app.multitasking.defaultTimeoutMs,
  });

  const log = async (line: string): Promise<void> => {
    try {
      await appendFile(logPath, `${new Date().toISOString()} ${line}\n`, "utf8");
    } catch {
      // best-effort
    }
  };

  await log(`[daemon] started pid=${process.pid}`);
  let running = true;
  const shutdown = async (signal: string) => {
    await log(`[daemon] received ${signal}, shutting down`);
    running = false;
    scheduler.pause();
    await scheduler.drain();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  while (running) {
    const due = await queue.pickDue();
    for (const task of due) {
      // Don't double-schedule if it's already running in the current pool.
      if (scheduler.list((s) => s.metadata.daemonTaskId === task.id && s.status === "running").length > 0) continue;
      scheduler.enqueue({
        metadata: { daemonTaskId: task.id, kind: task.kind },
        priority: typeof task.payload.priority === "number" ? task.payload.priority : 0,
        run: async (signal) => {
          await queue.update(task.id, { status: "running" });
          await log(`[daemon] running ${task.id} kind=${task.kind}`);
          try {
            const result = await dispatch(task, signal, log);
            const nextNext = computeNextRun(task);
            const completing = nextNext === null && (task.runCount ?? 0) + 1 >= getMaxRuns(task);
            await queue.update(task.id, {
              status: completing ? "completed" : "pending",
              runCount: (task.runCount ?? 0) + 1,
              lastResult: typeof result === "string" ? result.slice(0, 1_000) : JSON.stringify(result).slice(0, 1_000),
              nextRunAt: nextNext ? nextNext.toISOString() : null,
            });
            await log(`[daemon] completed ${task.id}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await queue.update(task.id, {
              status: "failed",
              lastError: message,
              runCount: (task.runCount ?? 0) + 1,
            });
            await log(`[daemon] failed ${task.id}: ${message}`);
            throw error;
          }
        },
      });
    }
    await sleep(bundle.app.daemon.heartbeatMs);
  }
}

async function dispatch(task: DaemonTask, signal: AbortSignal, log: (line: string) => Promise<void>): Promise<string> {
  if (task.kind === "watch") {
    const url = String(task.payload.url ?? "");
    if (!url) throw new Error("watch task missing payload.url");
    const response = await fetch(url, { signal });
    const body = await response.text();
    const hash = await sha256(body);
    const previous = String(task.payload._lastHash ?? "");
    if (hash !== previous && previous !== "") {
      const onChange = task.onChange ?? "";
      if (onChange) await runShell(onChange, signal, log);
    }
    task.payload._lastHash = hash;
    return `status=${response.status} hash=${hash.slice(0, 8)}`;
  }
  if (task.kind === "schedule" || task.kind === "command") {
    const command = String(task.payload.command ?? "");
    if (!command) throw new Error(`${task.kind} task missing payload.command`);
    return runShell(command, signal, log);
  }
  if (task.kind === "agent-task") {
    return runAgentTask(task, signal);
  }
  throw new Error(`Unknown daemon task kind: ${task.kind}`);
}

async function runShell(command: string, signal: AbortSignal, log: (line: string) => Promise<void>): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr?.on("data", (chunk) => (stderr += String(chunk)));
    const onAbort = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    };
    signal.addEventListener("abort", onAbort, { once: true });
    child.on("exit", async (code) => {
      signal.removeEventListener("abort", onAbort);
      if (code === 0) {
        await log(`[daemon] shell ok: ${command}`);
        resolve(stdout.slice(-500));
      } else {
        reject(new Error(`shell exited ${code}: ${stderr.slice(-500)}`));
      }
    });
    child.on("error", (err) => reject(err));
  });
}

async function runAgentTask(task: DaemonTask, _signal: AbortSignal): Promise<string> {
  const message = String(task.payload.message ?? "");
  if (!message) throw new Error("agent-task missing payload.message");
  // Lazily import to avoid loading the whole agent runtime when the daemon
  // only handles watch/schedule tasks.
  const { createRexaRuntime } = await import("../app/bootstrap");
  const runtime = await createRexaRuntime();
  const result = await runtime.agent.run(message, { userId: "daemon" });
  return result.response.slice(0, 1_000);
}

function computeNextRun(task: DaemonTask): Date | null {
  if (task.cron) {
    try {
      return nextRun(parseCron(task.cron), new Date());
    } catch (err) {
      logger.warn(`[daemon] bad cron ${task.cron}: ${(err as Error).message}`);
      return null;
    }
  }
  if (task.intervalMs) {
    if (task.expiresAt && Date.now() + task.intervalMs > Date.parse(task.expiresAt)) return null;
    return new Date(Date.now() + task.intervalMs);
  }
  return null;
}

function getMaxRuns(task: DaemonTask): number {
  if (task.cron) return Number.POSITIVE_INFINITY;
  if (task.intervalMs) return Number.POSITIVE_INFINITY;
  return 1;
}

async function sha256(text: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// When invoked directly via `node dist/.../daemon-worker.js`.
if (process.env.REXA_DAEMON === "1") {
  startDaemonWorker().catch((error) => {
    logger.error("[daemon] fatal", { err: String(error) });
    process.exit(1);
  });
}
