import { spawn } from "node:child_process";

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a child process and capture stdout/stderr. Used by every
 * computer-use backend so the spawn-and-collect logic stays in one
 * place.
 */
export async function run(command: string, args: string[], options: { input?: string | Buffer; timeoutMs?: number } = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let killed = false;
    const timer = options.timeoutMs
      ? setTimeout(() => {
          killed = true;
          child.kill("SIGKILL");
        }, options.timeoutMs)
      : null;
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      resolve({ exitCode: 127, stdout, stderr: stderr || error.message });
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        exitCode: killed ? 124 : code ?? 0,
        stdout,
        stderr,
      });
    });
    if (options.input !== undefined && child.stdin) {
      child.stdin.end(options.input);
    }
  });
}

export async function which(command: string): Promise<boolean> {
  const result = await run("sh", ["-lc", `command -v ${command}`]);
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}
