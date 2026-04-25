import { createId } from "../../common/result";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "../llm-provider.interface";

export class MockProvider implements LLMProvider {
  readonly type = "local" as const;

  constructor(
    readonly name = "mock",
    private readonly responsePrefix = "Rexa mock response",
  ) {}

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    const last = extractUserRequest(input.messages.at(-1)?.content ?? "");
    return {
      id: createId("llm"),
      provider: this.name,
      model: input.model,
      text: `${this.responsePrefix}: ${last}`,
      usage: { inputTokens: countTokens(input.messages.map((message) => message.content).join(" ")), outputTokens: 8, costUsd: 0 },
      metadata: { mock: true },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    const response = await this.generate(input);
    yield { textDelta: response.text, done: true };
  }
}

function countTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractUserRequest(content: string): string {
  const userRequest = content.match(/User request:\s*([\s\S]*?)(?:\n\nMemory:|\n\nSub-agent|\n\nValidation:|$)/i)?.[1]?.trim();
  if (userRequest) return userRequest;
  return content.split(/\n\nMemory:/i)[0]?.trim() ?? content.trim();
}
