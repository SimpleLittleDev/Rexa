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
  // The orchestrator builds a structured user-block; we only echo the
  // plain "User request" line so the mock response stays terse instead
  // of regurgitating planner steps + memory dumps back to the surface.
  const match = content.match(
    /User request:\s*([\s\S]*?)(?:\n\nDetected intent:|\n\nPlanner steps:|\n\nMemory:|\n\nRelevant long-term memory:|\n\nRecent conversation|\n\nSub-agent|\n\nValidation:|$)/i,
  );
  if (match?.[1]) return match[1].trim().slice(0, 500);
  return content.split(/\n\n/)[0]?.trim().slice(0, 500) ?? content.trim().slice(0, 500);
}
