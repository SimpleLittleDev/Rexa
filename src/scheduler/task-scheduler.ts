import { EventEmitter } from "node:events";
import { createId } from "../common/result";
import { logger } from "../logs/logger";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "blocked";

export interface SchedulableTask<T = unknown> {
  id: string;
  /** Higher numbers run first. */
  priority: number;
  /** IDs that must complete (status=completed) before this one runs. */
  dependencies: string[];
  /** Per-task hard timeout. */
  timeoutMs?: number;
  /** Max retries on failure (default 0). */
  maxRetries: number;
  retryCount: number;
  status: TaskStatus;
  enqueuedAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  result?: T;
  /** Free-form metadata for observability. */
  metadata: Record<string, unknown>;
  run: (signal: AbortSignal) => Promise<T>;
}

export interface SchedulerEvents<T = unknown> {
  taskQueued: [SchedulableTask<T>];
  taskStarted: [SchedulableTask<T>];
  taskCompleted: [SchedulableTask<T>];
  taskFailed: [SchedulableTask<T>];
  taskCancelled: [SchedulableTask<T>];
  drained: [];
}

/**
 * Concurrent task scheduler with priority + dependency support.
 *
 * Backbone of Rexa's hard-multitasking and the daemon's worker pool. Tasks
 * are not picked up until all their dependencies have finished successfully
 * (a dep that fails marks dependents as `blocked`). Each task receives an
 * `AbortSignal`, so timeouts and `cancel()` propagate cleanly.
 */
export class TaskScheduler<T = unknown> extends EventEmitter {
  private readonly tasks = new Map<string, SchedulableTask<T>>();
  private readonly running = new Map<string, AbortController>();
  private readonly concurrency: number;
  private readonly defaultTimeoutMs: number;
  private paused = false;
  private drainResolvers: Array<() => void> = [];

  constructor(options: { concurrency?: number; defaultTimeoutMs?: number } = {}) {
    super();
    this.concurrency = Math.max(1, options.concurrency ?? 4);
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 600_000;
  }

  enqueue<R = T>(
    spec: {
      run: (signal: AbortSignal) => Promise<R>;
      id?: string;
      priority?: number;
      dependencies?: string[];
      timeoutMs?: number;
      maxRetries?: number;
      metadata?: Record<string, unknown>;
    },
  ): SchedulableTask<R> {
    const task: SchedulableTask<R> = {
      id: spec.id ?? createId("task"),
      priority: spec.priority ?? 0,
      dependencies: spec.dependencies ?? [],
      timeoutMs: spec.timeoutMs ?? this.defaultTimeoutMs,
      maxRetries: spec.maxRetries ?? 0,
      retryCount: 0,
      status: "pending",
      enqueuedAt: Date.now(),
      metadata: spec.metadata ?? {},
      run: spec.run,
    };
    this.tasks.set(task.id, task as unknown as SchedulableTask<T>);
    this.emit("taskQueued", task as unknown as SchedulableTask<T>);
    queueMicrotask(() => this.tryDispatch());
    return task;
  }

  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    if (task.status === "running") {
      const controller = this.running.get(id);
      controller?.abort(new Error("cancelled"));
      task.status = "cancelled";
      task.finishedAt = Date.now();
      this.emit("taskCancelled", task);
      return true;
    }
    if (task.status === "pending" || task.status === "blocked") {
      task.status = "cancelled";
      task.finishedAt = Date.now();
      this.emit("taskCancelled", task);
      this.tryDispatch();
      return true;
    }
    return false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.tryDispatch();
  }

  list(filter?: (task: SchedulableTask<T>) => boolean): SchedulableTask<T>[] {
    const all = Array.from(this.tasks.values());
    return filter ? all.filter(filter) : all;
  }

  get(id: string): SchedulableTask<T> | undefined {
    return this.tasks.get(id);
  }

  /** Resolves once every task is in a terminal state. */
  async drain(): Promise<void> {
    if (this.isDrained()) return;
    return new Promise((resolve) => {
      this.drainResolvers.push(resolve);
    });
  }

  /** Number of tasks currently running. */
  get activeCount(): number {
    return this.running.size;
  }

  private isDrained(): boolean {
    if (this.running.size > 0) return false;
    for (const task of this.tasks.values()) {
      if (task.status === "pending" || task.status === "running" || task.status === "blocked") return false;
    }
    return true;
  }

  private tryDispatch(): void {
    if (this.paused) return;
    while (this.running.size < this.concurrency) {
      const next = this.pickNext();
      if (!next) break;
      this.runTask(next);
    }
    if (this.isDrained()) {
      const resolvers = this.drainResolvers.splice(0);
      this.emit("drained");
      resolvers.forEach((resolve) => resolve());
    }
  }

  private pickNext(): SchedulableTask<T> | null {
    const ready: SchedulableTask<T>[] = [];
    for (const task of this.tasks.values()) {
      if (task.status !== "pending" && task.status !== "blocked") continue;
      const depState = this.evaluateDependencies(task);
      if (depState === "ready") {
        task.status = "pending";
        ready.push(task);
      } else if (depState === "blocked") {
        task.status = "blocked";
      } else if (depState === "failed") {
        task.status = "failed";
        task.error = "dependency-failed";
        task.finishedAt = Date.now();
        this.emit("taskFailed", task);
      }
    }
    ready.sort((a, b) => b.priority - a.priority || a.enqueuedAt - b.enqueuedAt);
    return ready[0] ?? null;
  }

  private evaluateDependencies(task: SchedulableTask<T>): "ready" | "blocked" | "failed" {
    for (const depId of task.dependencies) {
      const dep = this.tasks.get(depId);
      if (!dep) continue;
      if (dep.status === "failed" || dep.status === "cancelled") return "failed";
      if (dep.status !== "completed") return "blocked";
    }
    return "ready";
  }

  private runTask(task: SchedulableTask<T>): void {
    task.status = "running";
    task.startedAt = Date.now();
    const controller = new AbortController();
    this.running.set(task.id, controller);
    this.emit("taskStarted", task);

    const timeout = setTimeout(() => {
      controller.abort(new Error(`task ${task.id} timed out after ${task.timeoutMs}ms`));
    }, task.timeoutMs ?? this.defaultTimeoutMs);

    task
      .run(controller.signal)
      .then((result) => {
        task.result = result as T;
        task.status = "completed";
        task.finishedAt = Date.now();
        this.emit("taskCompleted", task);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (task.retryCount < task.maxRetries) {
          task.retryCount += 1;
          task.status = "pending";
          logger.warn(`[scheduler] retry ${task.id}`, { attempt: task.retryCount, message });
        } else {
          task.error = message;
          task.status = "failed";
          task.finishedAt = Date.now();
          this.emit("taskFailed", task);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        this.running.delete(task.id);
        this.tryDispatch();
      });
  }
}
