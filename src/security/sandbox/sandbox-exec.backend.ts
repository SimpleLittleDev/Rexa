import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { defaultSandboxEnv, runProcessWithTimeout } from "./process-utils";
import type { SandboxBackend, SandboxPolicy, SandboxRunResult } from "./sandbox-types";

const execFileAsync = promisify(execFile);

/**
 * macOS backend powered by `sandbox-exec` (the same tool the OS uses
 * for App Sandbox). Apple deprecated it in 10.15+ but it remains
 * present and functional through current macOS releases. We render a
 * minimal SBPL profile, allow the executable, deny everything else by
 * default, and optionally allow network.
 */
export class SandboxExecBackend implements SandboxBackend {
  readonly name = "sandbox-exec" as const;

  async isAvailable(): Promise<boolean> {
    if (process.platform !== "darwin") return false;
    try {
      await execFileAsync("sandbox-exec", ["-h"], { timeout: 2_000 });
      return true;
    } catch {
      return false;
    }
  }

  async run(command: string, args: string[], policy: SandboxPolicy): Promise<SandboxRunResult> {
    const profileDir = mkdtempSync(join(tmpdir(), "rexa-sbpl-"));
    const profilePath = join(profileDir, "policy.sb");
    writeFileSync(profilePath, this.buildProfile(policy), "utf8");
    const argv = ["-f", profilePath, command, ...args];
    return runProcessWithTimeout("sandbox-exec", argv, {
      env: defaultSandboxEnv(policy.env ?? {}),
      timeoutMs: policy.timeoutMs ?? 60_000,
      backend: this.name,
      cwd: policy.cwd,
    });
  }

  private buildProfile(policy: SandboxPolicy): string {
    const lines = ["(version 1)", "(deny default)", "(allow process-fork)", "(allow process-exec)"];
    lines.push("(allow file-read*)");
    lines.push("(allow signal (target self))");
    if (policy.allowNetwork) lines.push("(allow network*)");
    lines.push('(allow file-read* file-write* (subpath "/tmp"))');
    for (const path of policy.writablePaths ?? []) {
      lines.push(`(allow file-read* file-write* (subpath "${path}"))`);
    }
    return lines.join("\n") + "\n";
  }
}
