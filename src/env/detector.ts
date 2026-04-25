import { access, constants, stat } from "node:fs/promises";
import { arch, platform, release, type } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface EnvironmentInfo {
  os: NodeJS.Platform;
  osType: string;
  osRelease: string;
  architecture: string;
  isTermux: boolean;
  isWindows: boolean;
  isLinux: boolean;
  nodeVersion: string;
  npmVersion: string | null;
  packageManager: string | null;
  shell: string | null;
  writableDirectories: string[];
  commands: Record<string, boolean>;
  browser: {
    chromium: boolean;
    googleChrome: boolean;
    playwrightPackage: boolean;
    recommendedMode: "chromium" | "playwright" | "remote-browser" | "auto" | "limited";
  };
}

export class EnvironmentDetector {
  async detect(): Promise<EnvironmentInfo> {
    const commandNames = ["node", "npm", "codex", "claude", "ollama", "chromium", "chromium-browser", "google-chrome"];
    const commands = Object.fromEntries(await Promise.all(commandNames.map(async (name) => [name, await commandExists(name)])));
    const isTermux = Boolean(process.env.PREFIX?.includes("com.termux") || process.env.TERMUX_VERSION || process.env.ANDROID_ROOT);
    const chromium = Boolean(commands.chromium || commands["chromium-browser"]);
    const googleChrome = Boolean(commands["google-chrome"]);
    const playwrightPackage = await packageResolvable("playwright") || await packageResolvable("playwright-core");

    return {
      os: platform(),
      osType: type(),
      osRelease: release(),
      architecture: arch(),
      isTermux,
      isWindows: platform() === "win32",
      isLinux: platform() === "linux",
      nodeVersion: process.version,
      npmVersion: await commandVersion("npm"),
      packageManager: commands.npm ? "npm" : null,
      shell: process.env.SHELL ?? process.env.ComSpec ?? null,
      writableDirectories: await writableDirs([process.cwd(), process.env.HOME, process.env.TMPDIR, "/tmp"].filter(Boolean) as string[]),
      commands,
      browser: {
        chromium,
        googleChrome,
        playwrightPackage,
        recommendedMode: recommendBrowserMode({ chromium, googleChrome, playwrightPackage }),
      },
    };
  }
}

export async function commandExists(command: string): Promise<boolean> {
  const lookup = platform() === "win32" ? "where" : "which";
  try {
    await execFileAsync(lookup, [command], { timeout: 3_000 });
    return true;
  } catch {
    return false;
  }
}

async function commandVersion(command: string): Promise<string | null> {
  try {
    const output = await execFileAsync(command, ["--version"], { timeout: 3_000 });
    return (output.stdout || output.stderr).trim().split(/\r?\n/)[0] ?? null;
  } catch {
    return null;
  }
}

async function packageResolvable(packageName: string): Promise<boolean> {
  try {
    require.resolve(packageName);
    return true;
  } catch {
    return false;
  }
}

async function writableDirs(paths: string[]): Promise<string[]> {
  const result: string[] = [];
  for (const path of [...new Set(paths)]) {
    try {
      if ((await stat(path)).isDirectory()) {
        await access(path, constants.W_OK);
        result.push(path);
      }
    } catch {
      // Ignore unavailable locations.
    }
  }
  return result;
}

function recommendBrowserMode(input: {
  chromium: boolean;
  googleChrome: boolean;
  playwrightPackage: boolean;
}): EnvironmentInfo["browser"]["recommendedMode"] {
  if (input.playwrightPackage && (input.chromium || input.googleChrome)) return "chromium";
  if (input.playwrightPackage) return "playwright";
  if (input.chromium || input.googleChrome) return "chromium";
  return "remote-browser";
}
