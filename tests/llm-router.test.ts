import { describe, expect, test } from "vitest";
import { LLMRouter } from "../src/llm/llm-router";
import type { LLMProvider, LLMRequest, LLMResponse } from "../src/llm/llm-provider.interface";

class StubProvider implements LLMProvider {
  constructor(
    public readonly name: string,
    public readonly available: boolean,
    private readonly text: string,
  ) {}

  readonly type = "api" as const;

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    return {
      id: `${this.name}-response`,
      provider: this.name,
      model: input.model,
      text: this.text,
      usage: { inputTokens: 1, outputTokens: 1, costUsd: 0 },
      metadata: {},
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<{ textDelta: string }> {
    yield { textDelta: (await this.generate(input)).text };
  }
}

describe("LLMRouter", () => {
  test("falls back when the configured provider is unavailable", async () => {
    const router = new LLMRouter(
      {
        "codex-cli": new StubProvider("codex-cli", false, "unreachable"),
        openai: new StubProvider("openai", true, "fallback-response"),
      },
      {
        roles: {
          coding: { provider: "codex-cli", model: "configured-coding-model" },
          fallback: { provider: "openai", model: "configured-fallback-model" },
        },
        fallbackOrder: ["openai"],
      },
    );

    const response = await router.generateForRole("coding", { messages: [{ role: "user", content: "refactor" }] });

    expect(response.provider).toBe("openai");
    expect(response.model).toBe("configured-fallback-model");
    expect(response.text).toBe("fallback-response");
  });
});
