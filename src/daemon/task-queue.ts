import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createId } from "../common/result";

export type DaemonTaskKind = "watch" | "schedule" | "command" | "agent-task";
export type DaemonTaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface DaemonTask {
  id: string;
  kind: DaemonTaskKind;
  /** Free-form payload (URL, cron expr, command line, agent message). */
  payload: Record<string, unknown>;
  /** ISO datetime; null = run immediately. */
  nextRunAt: string | null;
  /** ms between runs; null for one-shot. */
  intervalMs: number | null;
  /** Wall-clock deadline; null = unbounded. */
  expiresAt: string | null;
  /** Cron expression (5/6 fields). */
  cron: string | null;
  status: DaemonTaskStatus;
  /** Optional command to run on each successful tick (for `watch`). */
  onChange: string | null;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
  lastResult?: string;
  runCount: number;
}

interface QueueFile {
  version: 1;
  tasks: DaemonTask[];
}

/**
 * JSON-backed persistent task queue.
 *
 * Kept JSON instead of SQLite to avoid native deps in the optional daemon
 * runtime. For thousands of tasks this is fine — we batch reads/writes and
 * rewrite the whole file on each mutation (atomic rename via tmp file).
 */
export class TaskQueue {
  private cache: QueueFile = { version: 1, tasks: [] };
  private loaded = false;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    if (this.loaded) return;
    await mkdir(dirname(this.path), { recursive: true });
    try {
      const raw = await readFile(this.path, "utf8");
      this.cache = JSON.parse(raw) as QueueFile;
      if (!Array.isArray(this.cache.tasks)) this.cache.tasks = [];
    } catch {
      this.cache = { version: 1, tasks: [] };
      await this.persist();
    }
    this.loaded = true;
  }

  async create(spec: Omit<DaemonTask, "id" | "createdAt" | "updatedAt" | "status" | "runCount">): Promise<DaemonTask> {
    await this.load();
    const now = new Date().toISOString();
    const task: DaemonTask = {
      ...spec,
      id: createId("dtask"),
      status: "pending",
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.cache.tasks.push(task);
    await this.persist();
    return task;
  }

  async list(filter?: (task: DaemonTask) => boolean): Promise<DaemonTask[]> {
    await this.load();
    return filter ? this.cache.tasks.filter(filter) : [...this.cache.tasks];
  }

  async update(id: string, patch: Partial<DaemonTask>): Promise<DaemonTask | null> {
    await this.load();
    const index = this.cache.tasks.findIndex((task) => task.id === id);
    if (index === -1) return null;
    this.cache.tasks[index] = {
      ...this.cache.tasks[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.cache.tasks[index];
  }

  async cancel(id: string): Promise<boolean> {
    return Boolean(await this.update(id, { status: "cancelled" }));
  }

  async remove(id: string): Promise<boolean> {
    await this.load();
    const before = this.cache.tasks.length;
    this.cache.tasks = this.cache.tasks.filter((task) => task.id !== id);
    if (this.cache.tasks.length === before) return false;
    await this.persist();
    return true;
  }

  async pickDue(now = Date.now()): Promise<DaemonTask[]> {
    await this.load();
    return this.cache.tasks.filter((task) => {
      if (task.status === "cancelled" || task.status === "completed" || task.status === "failed") return false;
      if (task.expiresAt && Date.parse(task.expiresAt) < now) return false;
      if (!task.nextRunAt) return true;
      return Date.parse(task.nextRunAt) <= now;
    });
  }

  private async persist(): Promise<void> {
    const snapshot = JSON.stringify(this.cache, null, 2);
    this.writeChain = this.writeChain.then(async () => {
      const tmp = `${this.path}.tmp`;
      await writeFile(tmp, snapshot, "utf8");
      const { rename } = await import("node:fs/promises");
      await rename(tmp, this.path);
    });
    await this.writeChain;
  }
}
