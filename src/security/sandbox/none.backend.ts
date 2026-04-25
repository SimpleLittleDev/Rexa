import { defaultSandboxEnv, runProcessWithTimeout } from "./process-utils";
import type { SandboxBackend, SandboxPolicy, SandboxRunResult } from "./sandbox-types";

/**
 * No-isolation backend — used when sandbox is disabled or no usable
 * backend is available on the host. Still applies the wall-clock
 * timeout and the minimum-env hygiene to avoid leaking secrets, but
 * does NOT provide filesystem/network isolation.
 *
 * Callers must check `result.backend === "none"` if they need to
 * refuse running untrusted code without isolation.
 */
export class NoneBackend implements SandboxBackend {
  readonly name = "none" as const;

  async isAvailable(): Promise<boolean> {
    return true;
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
