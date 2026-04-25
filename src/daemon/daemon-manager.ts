import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveRexaHome } from "../app/paths";
import type { DaemonConfig } from "../app/config";
import { logger } from "../logs/logger";

export interface DaemonStatus {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  pidFile: string;
}

/**
 * Lifecycle manager for the Rexa daemon.
 *
 * `start()` spawns a detached `node` process running the daemon entrypoint.
 * The PID and timestamp are written to `<runtimeDir>/daemon.pid` so other
 * commands can query / signal it.
 */
export class DaemonManager {
  private readonly runtimeDir: string;
  private readonly pidFile: string;
  private readonly stateFile: string;
  private readonly logFile: string;

  constructor(private readonly config: DaemonConfig) {
    const home = resolveRexaHome();
    this.runtimeDir = config.runtimeDir.startsWith("/") ? config.runtimeDir : join(home, config.runtimeDir);
    this.pidFile = join(this.runtimeDir, "daemon.pid");
    this.stateFile = join(this.runtimeDir, "daemon.state.json");
    this.logFile = join(this.runtimeDir, "daemon.log");
  }

  async status(): Promise<DaemonStatus> {
    if (!existsSync(this.pidFile)) {
      return { running: false, pid: null, startedAt: null, pidFile: this.pidFile };
    }
    try {
      const raw = await readFile(this.stateFile, "utf8");
      const state = JSON.parse(raw) as { pid: number; startedAt: string };
      const alive = isAlive(state.pid);
      return {
        running: alive,
        pid: alive ? state.pid : null,
        startedAt: alive ? state.startedAt : null,
        pidFile: this.pidFile,
      };
    } catch {
      return { running: false, pid: null, startedAt: null, pidFile: this.pidFile };
    }
  }

  async start(entrypoint: string): Promise<DaemonStatus> {
    const existing = await this.status();
    if (existing.running) return existing;

    await mkdir(this.runtimeDir, { recursive: true });
    await mkdir(dirname(this.logFile), { recursive: true });

    const child: ChildProcess = spawn(process.execPath, [entrypoint], {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
      env: { ...process.env, REXA_DAEMON: "1" },
    });
    child.unref();
    if (!child.pid) throw new Error("Failed to spawn daemon process");

    const startedAt = new Date().toISOString();
    await writeFile(this.pidFile, String(child.pid), "utf8");
    await writeFile(this.stateFile, JSON.stringify({ pid: child.pid, startedAt }, null, 2), "utf8");
    logger.info("[daemon] started", { pid: child.pid, log: this.logFile });
    return { running: true, pid: child.pid, startedAt, pidFile: this.pidFile };
  }

  async stop(): Promise<boolean> {
    const status = await this.status();
    if (!status.running || status.pid === null) return false;
    try {
      process.kill(status.pid, "SIGTERM");
    } catch {
      // process already gone
    }
    await rm(this.pidFile, { force: true });
    await rm(this.stateFile, { force: true });
    return true;
  }

  /** Returns the path to the live daemon log (tail-friendly). */
  logPath(): string {
    return this.logFile;
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
