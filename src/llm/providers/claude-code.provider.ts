import { createId } from "../../common/result";
import { CLIProviderDetector } from "../cli-provider-detector";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "../llm-provider.interface";
import { applyTemplate, runCLI } from "./cli-runner";
import type { CLIProviderOptions } from "./codex-cli.provider";

export class ClaudeCodeProvider implements LLMProvider {
  readonly name = "claude-code";
  readonly type = "cli" as const;
  private readonly binary: string;
  private readonly argsTemplate: string[];
  private readonly timeoutMs: number;

  constructor(
    private readonly detector = new CLIProviderDetector(),
    options: CLIProviderOptions = {},
  ) {
    this.binary = options.binary ?? "claude";
    this.argsTemplate = options.argsTemplate ?? ["-p", "{prompt}"];
    this.timeoutMs = options.timeoutMs ?? 180_000;
  }

  async isAvailable(): Promise<boolean> {
    if (process.env.REXA_DISABLE_CLI_LLM === "1") return false;
    return (await this.detector.checkClaudeCodeCLI()).ready;
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    if (!(await this.isAvailable())) {
      throw new Error(
        "Claude Code belum siap. Install dengan 'npm install -g @anthropic-ai/claude-code', lalu jalankan 'claude' untuk login/auth.",
      );
    }
    const prompt = input.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n");
    const args = applyTemplate(this.argsTemplate, { model: input.model ?? "auto", prompt });
    const result = await runCLI({ binary: this.binary, args, timeoutMs: this.timeoutMs });
    if (result.exitCode !== 0) throw new Error(result.stderr || `claude exited with code ${result.exitCode}`);
    return {
      id: createId("claude"),
      provider: this.name,
      model: input.model,
      text: result.stdout.trim(),
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      metadata: { stderr: result.stderr.trim() },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    yield { textDelta: (await this.generate(input)).text, done: true };
  }
}
