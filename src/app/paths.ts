import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

/**
 * Resolve the directory Rexa should treat as its "home" — i.e. where it
 * reads config, writes data/logs, and stores SQLite/JSON storage.
 *
 * Priority:
 *   1. `REXA_HOME` env var (always wins).
 *   2. Current working directory if it contains a `config/` directory
 *      (project-local mode — same as previous behaviour).
 *   3. Per-user fallback: `~/.rexa` (Linux/macOS/Termux) or
 *      `%USERPROFILE%\.rexa` (Windows).
 *
 * The fallback enables a globally installed `rexa` to work from any folder.
 */
export function resolveRexaHome(): string {
  const explicit = process.env.REXA_HOME;
  if (explicit && explicit.trim().length > 0) return explicit;
  const cwd = process.cwd();
  if (existsSync(join(cwd, "config"))) return cwd;
  const home = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
  return join(home, platform() === "win32" ? ".rexa" : ".rexa");
}
