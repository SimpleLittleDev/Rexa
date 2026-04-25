import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { defaultSandboxEnv, runProcessWithTimeout } from "./process-utils";
import type { SandboxBackend, SandboxPolicy, SandboxRunResult } from "./sandbox-types";

const execFileAsync = promisify(execFile);

/**
 * Linux backend using `bwrap` (Bubblewrap) — the same tooling Flatpak
 * uses. We mount a fresh procfs/devtmpfs, drop privs, and bind-mount a
 * read-only `/usr` plus a writable scratch dir from the host.
 *
 * Bubblewrap is widely packaged (`apt install bubblewrap`,
 * `pacman -S bubblewrap`, `apk add bubblewrap`, `dnf install
 * bubblewrap`), works without root, and is what GNOME, Flatpak, and
 * GitHub Codespaces use for unprivileged sandboxing.
 */
export class BubblewrapBackend implements SandboxBackend {
  readonly name = "bubblewrap" as const;

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync("bwrap", ["--version"], { timeout: 2_000 });
      return true;
    } catch {
      return false;
    }
  }

  async run(command: string, args: string[], policy: SandboxPolicy): Promise<SandboxRunResult> {
    const argv: string[] = ["--die-with-parent", "--unshare-user"];
    if (!policy.allowNetwork) argv.push("--unshare-net");
    argv.push(
      "--unshare-pid",
      "--unshare-ipc",
      "--unshare-uts",
      "--unshare-cgroup-try",
      "--proc",
      "/proc",
      "--dev",
      "/dev",
      "--tmpfs",
      "/tmp",
      "--ro-bind",
      "/usr",
      "/usr",
      "--ro-bind",
      "/etc",
      "/etc",
      "--symlink",
      "usr/lib",
      "/lib",
      "--symlink",
      "usr/lib64",
      "/lib64",
      "--symlink",
      "usr/bin",
      "/bin",
      "--symlink",
      "usr/sbin",
      "/sbin",
    );
    for (const path of policy.readonlyPaths ?? []) {
      argv.push("--ro-bind-try", path, path);
    }
    for (const path of policy.writablePaths ?? []) {
      argv.push("--bind-try", path, path);
    }
    if (policy.cwd) argv.push("--chdir", policy.cwd);
    argv.push("--setenv", "PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin");
    argv.push("--clearenv");
    for (const [key, value] of Object.entries(defaultSandboxEnv(policy.env ?? {}))) {
      argv.push("--setenv", key, value ?? "");
    }
    argv.push(command, ...args);
    return runProcessWithTimeout("bwrap", argv, {
      env: defaultSandboxEnv(policy.env ?? {}),
      timeoutMs: policy.timeoutMs ?? 60_000,
      backend: this.name,
      cwd: policy.cwd,
    });
  }
}
