import { spawn } from "node:child_process";
import { fail, ok, type ToolResult } from "../../common/result";
import { RiskEngine } from "../../agent/risk-engine";

export interface TerminalRunOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  confirmed?: boolean;
}

export interface TerminalRunData {
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export class TerminalTool {
  private readonly riskEngine: RiskEngine;

  constructor(options: { riskEngine?: RiskEngine } = {}) {
    this.riskEngine = options.riskEngine ?? new RiskEngine();
  }

  async run(command: string, options: TerminalRunOptions = {}): Promise<ToolResult<TerminalRunData>> {
    const risk = this.riskEngine.assessCommand(command);
    if (risk.requiresConfirmation && !options.confirmed) {
      return fail("CONFIRMATION_REQUIRED", `Command requires confirmation: ${risk.reasons.join(", ")}`, {
        recoverable: true,
        suggestedFallback: "Ask user to confirm or choose a safer command",
        metadata: { risk },
      });
    }

    const startedAt = Date.now();
    const cwd = options.cwd ?? process.cwd();

    return new Promise((resolve) => {
      const child = spawn(command, {
        cwd,
        env: { ...process.env, ...options.env },
        shell: true,
      });
      let stdout = "";
      let stderr = "";
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill("SIGTERM");
        resolve(
          fail("COMMAND_TIMEOUT", `Command exceeded ${options.timeoutMs ?? 30_000}ms`, {
            recoverable: true,
            suggestedFallback: "Retry with a longer timeout or smaller command",
          }),
        );
      }, options.timeoutMs ?? 30_000);

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(fail("COMMAND_FAILED", error.message, { recoverable: true }));
      });
      child.on("close", (exitCode) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        const data: TerminalRunData = {
          command,
          cwd,
          exitCode,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
        };
        if (exitCode === 0) {
          resolve(ok(data, { risk }));
        } else {
          resolve(
            fail("COMMAND_FAILED", `Command failed with exit code ${exitCode}`, {
              recoverable: true,
              suggestedFallback: "Inspect stderr and retry with a safer command",
              metadata: { ...data, risk },
            }),
          );
        }
      });
    });
  }
}
