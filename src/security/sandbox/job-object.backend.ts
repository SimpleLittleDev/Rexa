import { defaultSandboxEnv, runProcessWithTimeout } from "./process-utils";
import type { SandboxBackend, SandboxPolicy, SandboxRunResult } from "./sandbox-types";

/**
 * Windows backend. Real Job Object isolation requires native bindings
 * (winapi `CreateJobObject` + `AssignProcessToJobObject`) which we
 * intentionally don't pull in here to keep the install footprint
 * small. Instead we run the child with a hard timeout, the minimum
 * env, and rely on the OS user permissions for filesystem isolation.
 *
 * For stronger isolation users can opt into a real container backend
 * (e.g. Windows Sandbox or `wsb`) via a custom `backend` later — the
 * interface is the same.
 */
export class JobObjectBackend implements SandboxBackend {
  readonly name = "job-object" as const;

  async isAvailable(): Promise<boolean> {
    return process.platform === "win32";
  }

  async run(command: string, args: string[], policy: SandboxPolicy): Promise<SandboxRunResult> {
    return runProcessWithTimeout(command, args, {
      env: defaultSandboxEnv(policy.env ?? {}),
      timeoutMs: policy.timeoutMs ?? 60_000,
      backend: this.name,
      cwd: policy.cwd,
    });
  }
}
