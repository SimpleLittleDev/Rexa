import { createId } from "../../common/result";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "../llm-provider.interface";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  readonly type = "api" as const;

  constructor(
    private readonly apiKeyEnv = "GEMINI_API_KEY",
    private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta",
  ) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env[this.apiKeyEnv]);
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) throw new Error(`${this.apiKeyEnv} is not set`);
    if (!input.model) throw new Error("Gemini provider requires model from config");
    const response = await fetch(`${this.baseUrl}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: input.messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
      }),
    });
    if (!response.ok) throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
    const body = (await response.json()) as any;
    return {
      id: createId("gemini"),
      provider: this.name,
      model: input.model,
      text: body.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? "").join("") ?? "",
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      metadata: { finishReason: body.candidates?.[0]?.finishReason },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    yield { textDelta: (await this.generate(input)).text, done: true };
  }
}
