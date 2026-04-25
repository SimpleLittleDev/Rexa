import type { SandboxConfig } from "../../app/config";
import { logger } from "../../logs/logger";
import { BubblewrapBackend } from "./bubblewrap.backend";
import { FirejailBackend } from "./firejail.backend";
import { JobObjectBackend } from "./job-object.backend";
import { NoneBackend } from "./none.backend";
import { SandboxExecBackend } from "./sandbox-exec.backend";
import type {
  SandboxBackend,
  SandboxBackendName,
  SandboxPolicy,
  SandboxRunResult,
} from "./sandbox-types";

/**
 * SandboxManager picks the strongest available backend at boot, caches
 * the decision, and offers a single `run()` API to the rest of the
 * codebase. Hand callers the choice to override the backend per-call
 * via `policy.backend`, but default to the auto-selected one.
 */
export class SandboxManager {
  private readonly backends: SandboxBackend[];
  private resolvedBackend: SandboxBackend | null = null;

  constructor(private readonly config: SandboxConfig) {
    this.backends = [
      new BubblewrapBackend(),
      new FirejailBackend(),
      new SandboxExecBackend(),
      new JobObjectBackend(),
      new NoneBackend(),
    ];
  }

  async resolveBackend(): Promise<SandboxBackend> {
    if (this.resolvedBackend) return this.resolvedBackend;
    if (!this.config.enabled) {
      this.resolvedBackend = this.backends.find((b) => b.name === "none")!;
      return this.resolvedBackend;
    }
    if (this.config.backend && this.config.backend !== "auto") {
      const explicit = this.backends.find((b) => b.name === this.config.backend);
      if (explicit && (await explicit.isAvailable())) {
        this.resolvedBackend = explicit;
        return explicit;
      }
      logger.warn("[sandbox] configured backend unavailable, falling back to auto", {
        configured: this.config.backend,
      });
    }
    for (const backend of this.backends) {
      if (backend.name === "none") continue;
      if (await backend.isAvailable()) {
        this.resolvedBackend = backend;
        logger.info("[sandbox] using backend", { backend: backend.name });
        return backend;
      }
    }
    logger.warn("[sandbox] no isolation backend available — falling back to none");
    this.resolvedBackend = this.backends.find((b) => b.name === "none")!;
    return this.resolvedBackend;
  }

  async run(command: string, args: string[], policy: SandboxPolicy = {}): Promise<SandboxRunResult> {
    const merged: SandboxPolicy = {
      timeoutMs: policy.timeoutMs ?? this.config.defaultTimeoutMs,
      memoryLimitMb: policy.memoryLimitMb ?? this.config.memoryLimitMb,
      cpuLimit: policy.cpuLimit ?? this.config.cpuLimit,
      allowNetwork: policy.allowNetwork ?? this.config.allowNetwork,
      writablePaths: policy.writablePaths ?? this.config.writablePaths,
      readonlyPaths: policy.readonlyPaths,
      env: policy.env,
      cwd: policy.cwd,
      uid: policy.uid,
      gid: policy.gid,
      backend: policy.backend,
    };
    const backend = await this.pickBackend(merged.backend);
    return backend.run(command, args, merged);
  }

  async availableBackends(): Promise<SandboxBackendName[]> {
    const out: SandboxBackendName[] = [];
    for (const backend of this.backends) {
      if (await backend.isAvailable()) out.push(backend.name);
    }
    return out;
  }

  private async pickBackend(override?: SandboxBackendName): Promise<SandboxBackend> {
    if (!override || override === "auto") return this.resolveBackend();
    const requested = this.backends.find((b) => b.name === override);
    if (requested && (await requested.isAvailable())) return requested;
    logger.warn("[sandbox] requested backend unavailable, using auto", { requested: override });
    return this.resolveBackend();
  }
}
