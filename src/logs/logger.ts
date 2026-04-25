import { color } from "../cli/tui";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): number {
  const env = (process.env.REXA_LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
  return LEVELS[env] ?? LEVELS.info;
}

function fmt(level: LogLevel, scope: string, message: string): string {
  const tag =
    level === "debug"
      ? color.dim(`debug ${scope}`)
      : level === "info"
        ? color.brightBlue(`info  ${scope}`)
        : level === "warn"
          ? color.yellow(`warn  ${scope}`)
          : color.red(`error ${scope}`);
  return `${tag} ${color.dim("›")} ${message}`;
}

export function createLogger(scope: string) {
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      if (LEVELS.debug < currentLevel()) return;
      console.log(fmt("debug", scope, message) + suffix(meta));
    },
    info(message: string, meta?: Record<string, unknown>) {
      if (LEVELS.info < currentLevel()) return;
      console.log(fmt("info", scope, message) + suffix(meta));
    },
    warn(message: string, meta?: Record<string, unknown>) {
      if (LEVELS.warn < currentLevel()) return;
      console.warn(fmt("warn", scope, message) + suffix(meta));
    },
    error(message: string, meta?: Record<string, unknown>) {
      if (LEVELS.error < currentLevel()) return;
      console.error(fmt("error", scope, message) + suffix(meta));
    },
  };
}

function suffix(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  return " " + color.dim(JSON.stringify(meta));
}

/** Default logger instance for ad-hoc use. */
export const logger = createLogger("rexa");
