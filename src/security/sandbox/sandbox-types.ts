/**
 * Sandbox abstractions used by the terminal tool, code-execution paths,
 * and any future plugin runtime. The concrete backend is selected at
 * runtime by `SandboxManager` based on platform availability and the
 * caller's configured policy.
 */

export interface SandboxPolicy {
  /** Wall-clock timeout in ms. Default: config.defaultTimeoutMs. */
  timeoutMs?: number;
  /** Memory cap in MB (best-effort; backend-dependent). */
  memoryLimitMb?: number;
  /** CPU quota (best-effort). */
  cpuLimit?: number;
  /** Allow outbound network. Defaults to false for paranoia. */
  allowNetwork?: boolean;
  /** Sandbox-relative paths the process is allowed to write to. */
  writablePaths?: string[];
  /** Sandbox-relative paths exposed read-only (in addition to defaults). */
  readonlyPaths?: string[];
  /** Environment variables to expose. Default is a tiny safe subset. */
  env?: Record<string, string>;
  /** Working directory inside the sandbox. */
  cwd?: string;
  /** Optional uid/gid drop (Linux only). */
  uid?: number;
  gid?: number;
  /** Override the default backend selection for one call. */
  backend?: SandboxBackendName;
}

export type SandboxBackendName =
  | "auto"
  | "bubblewrap"
  | "sandbox-exec"
  | "firejail"
  | "job-object"
  | "none";

export interface SandboxRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  backend: SandboxBackendName;
}

export interface SandboxBackend {
  readonly name: SandboxBackendName;
  /** Quick check the backend is usable on this host. */
  isAvailable(): Promise<boolean>;
  /** Run a single command and collect stdout/stderr. */
  run(command: string, args: string[], policy: SandboxPolicy): Promise<SandboxRunResult>;
}
