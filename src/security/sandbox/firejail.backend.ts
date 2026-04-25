import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { defaultSandboxEnv, runProcessWithTimeout } from "./process-utils";
import type { SandboxBackend, SandboxPolicy, SandboxRunResult } from "./sandbox-types";

const execFileAsync = promisify(execFile);

/**
 * Firejail backend — secondary Linux choice when bubblewrap isn't
 * available. Generally needs setuid root (distro-installed) and offers
 * a different tradeoff (full SECCOMP profile, AppArmor integration).
 */
export class FirejailBackend implements SandboxBackend {
  readonly name = "firejail" as const;

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync("firejail", ["--version"], { timeout: 2_000 });
      return true;
    } catch {
      return false;
    }
  }

  async run(command: string, args: string[], policy: SandboxPolicy): Promise<SandboxRunResult> {
    const argv: string[] = [
      "--quiet",
      "--noprofile",
      "--caps.drop=all",
      "--seccomp",
      "--nogroups",
      "--nonewprivs",
      "--noroot",
    ];
    if (!policy.allowNetwork) argv.push("--net=none");
    if (policy.cwd) argv.push(`--chroot=${policy.cwd}`);
    if (policy.memoryLimitMb) argv.push(`--rlimit-as=${policy.memoryLimitMb * 1024 * 1024}`);
    argv.push("--", command, ...args);
    return runProcessWithTimeout("firejail", argv, {
      env: defaultSandboxEnv(policy.env ?? {}),
      timeoutMs: policy.timeoutMs ?? 60_000,
      backend: this.name,
      cwd: policy.cwd,
    });
  }
}
