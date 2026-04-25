import { createId } from "../../common/result";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "../llm-provider.interface";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly type = "api" as const;

  constructor(
    private readonly apiKeyEnv = "ANTHROPIC_API_KEY",
    private readonly baseUrl = "https://api.anthropic.com/v1",
  ) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env[this.apiKeyEnv]);
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) throw new Error(`${this.apiKeyEnv} is not set`);
    if (!input.model) throw new Error("Anthropic provider requires model from config");
    const system = input.messages.find((message) => message.role === "system")?.content;
    const messages = input.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content }));

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        system,
        messages,
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature,
      }),
    });
    if (!response.ok) throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
    const body = (await response.json()) as any;
    return {
      id: body.id ?? createId("anthropic"),
      provider: this.name,
      model: input.model,
      text: body.content?.map((part: any) => part.text ?? "").join("") ?? "",
      usage: {
        inputTokens: body.usage?.input_tokens ?? 0,
        outputTokens: body.usage?.output_tokens ?? 0,
        costUsd: 0,
      },
      metadata: { stopReason: body.stop_reason },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    yield { textDelta: (await this.generate(input)).text, done: true };
  }
}
