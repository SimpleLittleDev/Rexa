import { spawn } from "node:child_process";

export interface CLIRunOptions {
  binary: string;
  args: string[];
  input?: string;
  timeoutMs?: number;
}

export interface CLIRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function runCLI(options: CLIRunOptions): Promise<CLIRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.binary, options.args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`${options.binary} timed out after ${options.timeoutMs ?? 120_000}ms`));
    }, options.timeoutMs ?? 120_000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode });
    });
    if (options.input) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

export function applyTemplate(args: string[], values: Record<string, string>): string[] {
  return args.map((arg) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), arg));
}
