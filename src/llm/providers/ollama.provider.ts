import { createId } from "../../common/result";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "../llm-provider.interface";

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  readonly type = "local" as const;

  constructor(private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434") {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { method: "GET" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    if (!input.model) throw new Error("Ollama provider requires model from config");
    const prompt = input.messages.map((message) => `${message.role}: ${message.content}`).join("\n");
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: input.model, prompt, stream: false }),
    });
    if (!response.ok) throw new Error(`Ollama request failed: ${response.status} ${await response.text()}`);
    const body = (await response.json()) as any;
    return {
      id: createId("ollama"),
      provider: this.name,
      model: input.model,
      text: body.response ?? "",
      usage: {
        inputTokens: body.prompt_eval_count ?? 0,
        outputTokens: body.eval_count ?? 0,
        costUsd: 0,
      },
      metadata: { done: body.done },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    yield { textDelta: (await this.generate(input)).text, done: true };
  }
}
