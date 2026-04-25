import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import type { SandboxBackendName, SandboxRunResult } from "./sandbox-types";

/**
 * Spawns `command` with `args`, streams stdout/stderr into buffers, and
 * enforces a wall-clock timeout. Backends share this routine so they
 * only have to focus on building the right argv prefix.
 */
export async function runProcessWithTimeout(
  command: string,
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    timeoutMs: number;
    backend: SandboxBackendName;
  },
): Promise<SandboxRunResult> {
  const start = performance.now();
  const child = spawn(command, args, {
    env: options.env ?? {},
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, options.timeoutMs);

  return new Promise<SandboxRunResult>((resolve, reject) => {
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        signal,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        durationMs: performance.now() - start,
        timedOut,
        backend: options.backend,
      });
    });
  });
}

/**
 * The minimal-but-safe environment exposed inside sandboxed processes.
 * We intentionally drop SSH agents, AWS keys, etc. unless the caller
 * explicitly opts them back in via `policy.env`.
 */
export function defaultSandboxEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOME: process.env.HOME ?? "/tmp",
    LANG: process.env.LANG ?? "C.UTF-8",
    TERM: "dumb",
    ...extra,
  };
}
