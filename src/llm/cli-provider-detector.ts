import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

export interface CLIProviderStatus {
  provider: "codex-cli" | "claude-code";
  binary: "codex" | "claude";
  installed: boolean;
  authenticated: boolean;
  version: string | null;
  ready: boolean;
  installCommand: string;
  authCommand: string;
  error: string | null;
}

export interface CommandRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (command: string, args?: string[]) => Promise<CommandRunResult>;

export interface CLIProviderDetectorOptions {
  homeDir?: string;
  runCommand?: CommandRunner;
  fileExists?: (path: string) => Promise<boolean>;
}

export class CLIProviderDetector {
  private readonly homeDir: string;
  private readonly runCommand: CommandRunner;
  private readonly fileExists: (path: string) => Promise<boolean>;

  constructor(options: CLIProviderDetectorOptions = {}) {
    this.homeDir = options.homeDir ?? homedir();
    this.runCommand = options.runCommand ?? defaultRunCommand;
    this.fileExists = options.fileExists ?? defaultFileExists;
  }

  async checkCodexCLI(): Promise<CLIProviderStatus> {
    return this.checkProvider({
      provider: "codex-cli",
      binary: "codex",
      installCommand: "npm install -g @openai/codex",
      authCommand: "codex",
      authFiles: [join(this.homeDir, ".codex", "auth.json"), join(this.homeDir, ".config", "codex", "auth.json")],
    });
  }

  async checkClaudeCodeCLI(): Promise<CLIProviderStatus> {
    return this.checkProvider({
      provider: "claude-code",
      binary: "claude",
      installCommand: "npm install -g @anthropic-ai/claude-code",
      authCommand: "claude",
      authFiles: [join(this.homeDir, ".claude.json"), join(this.homeDir, ".claude"), join(this.homeDir, ".config", "claude")],
    });
  }

  async ensureCLIProviderReady(providerName: "codex-cli" | "claude-code"): Promise<boolean> {
    const status = providerName === "codex-cli" ? await this.checkCodexCLI() : await this.checkClaudeCodeCLI();
    return status.ready;
  }

  async detectAll(): Promise<CLIProviderStatus[]> {
    return Promise.all([this.checkCodexCLI(), this.checkClaudeCodeCLI()]);
  }

  private async checkProvider(config: {
    provider: "codex-cli" | "claude-code";
    binary: "codex" | "claude";
    installCommand: string;
    authCommand: string;
    authFiles: string[];
  }): Promise<CLIProviderStatus> {
    const versionResult = await this.runCommand(config.binary, ["--version"]);
    const installed = versionResult.exitCode === 0;
    const version = installed ? firstLine(versionResult.stdout || versionResult.stderr) : null;

    if (!installed) {
      return {
        provider: config.provider,
        binary: config.binary,
        installed: false,
        authenticated: false,
        version: null,
        ready: false,
        installCommand: config.installCommand,
        authCommand: config.authCommand,
        error: `${title(config.provider)} binary not found`,
      };
    }

    const authenticated = await this.hasAnyAuthSignal(config.authFiles);
    return {
      provider: config.provider,
      binary: config.binary,
      installed: true,
      authenticated,
      version,
      ready: authenticated,
      installCommand: config.installCommand,
      authCommand: config.authCommand,
      error: authenticated ? null : `${title(config.provider)} needs auth. Run '${config.authCommand}' manually and finish login.`,
    };
  }

  private async hasAnyAuthSignal(paths: string[]): Promise<boolean> {
    for (const path of paths) {
      if (await this.fileExists(path)) return true;
    }
    return false;
  }
}

async function defaultRunCommand(command: string, args: string[] = []): Promise<CommandRunResult> {
  try {
    const output = await execFileAsync(command, args, { timeout: 5_000 });
    return { exitCode: 0, stdout: output.stdout, stderr: output.stderr };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number | string };
    return {
      exitCode: typeof err.code === "number" ? err.code : 127,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message,
    };
  }
}

async function defaultFileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function firstLine(value: string): string {
  return value.trim().split(/\r?\n/)[0] ?? "";
}

function title(provider: string): string {
  return provider === "codex-cli" ? "Codex CLI" : "Claude Code";
}
