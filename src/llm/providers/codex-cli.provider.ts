import { createId } from "../../common/result";
import { CLIProviderDetector, type CLIProviderStatus } from "../cli-provider-detector";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "../llm-provider.interface";
import { runCLI, type CLIRunOptions, type CLIRunResult } from "./cli-runner";

export interface CLIProviderOptions {
  binary?: string;
  argsTemplate?: string[];
  timeoutMs?: number;
  runCLI?: (options: CLIRunOptions) => Promise<CLIRunResult>;
}

export interface CodexDetectorLike {
  checkCodexCLI(): Promise<CLIProviderStatus>;
}

export class CodexCLIProvider implements LLMProvider {
  readonly name = "codex-cli";
  readonly type = "cli" as const;
  private readonly binary: string;
  private readonly timeoutMs: number;
  private readonly cliRunner: (options: CLIRunOptions) => Promise<CLIRunResult>;

  constructor(
    private readonly detector: CodexDetectorLike = new CLIProviderDetector(),
    options: CLIProviderOptions = {},
  ) {
    this.binary = options.binary ?? "codex";
    this.timeoutMs = options.timeoutMs ?? 180_000;
    this.cliRunner = options.runCLI ?? runCLI;
  }

  async isAvailable(): Promise<boolean> {
    if (process.env.REXA_DISABLE_CLI_LLM === "1") return false;
    return (await this.detector.checkCodexCLI()).ready;
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    if (!(await this.isAvailable())) {
      throw new Error(
        "Codex CLI belum siap. Install dengan 'npm install -g @openai/codex', lalu jalankan 'codex' untuk login/auth.",
      );
    }
    const prompt = input.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n");
    const execOptions = buildCodexExecOptions(input.model ?? "auto", prompt);
    const result = await this.cliRunner({ binary: this.binary, ...execOptions, timeoutMs: this.timeoutMs });
    if (result.exitCode !== 0) throw new Error(result.stderr || `codex exited with code ${result.exitCode}`);
    const text = parseCodexTextOutput(result.stdout);
    return {
      id: createId("codex"),
      provider: this.name,
      model: input.model,
      text,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      metadata: { stderr: result.stderr.trim() },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    yield { textDelta: (await this.generate(input)).text, done: true };
  }
}

export function buildCodexExecOptions(model: string, prompt: string): Pick<CLIRunOptions, "args" | "input"> {
  return {
    args: ["exec", "--model", model, "--skip-git-repo-check", "--color", "never", "-"],
    input: prompt,
  };
}

export function parseCodexTextOutput(stdout: string): string {
  const lines = stdout
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd());
  const codexIndex = lines.lastIndexOf("codex");
  const tokenIndex = lines.findIndex((line, index) => index > codexIndex && line === "tokens used");
  if (codexIndex >= 0) {
    const end = tokenIndex >= 0 ? tokenIndex : lines.length;
    const extracted = lines.slice(codexIndex + 1, end).join("\n").trim();
    if (extracted) return dedupeRepeatedFinalText(extracted);
  }
  return stdout.trim();
}

function dedupeRepeatedFinalText(text: string): string {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 2 && lines[0] === lines[1]) return lines[0];
  return text;
}
