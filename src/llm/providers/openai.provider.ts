import { createId } from "../../common/result";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "../llm-provider.interface";

export interface OpenAIProviderOptions {
  apiKeyEnv?: string;
  baseUrl?: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly name: string = "openai";
  readonly type = "api" as const;
  private readonly apiKeyEnv: string;
  private readonly baseUrl: string;

  constructor(options: OpenAIProviderOptions = {}) {
    this.apiKeyEnv = options.apiKeyEnv ?? "OPENAI_API_KEY";
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env[this.apiKeyEnv]);
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) throw new Error(`${this.apiKeyEnv} is not set`);
    if (!input.model) throw new Error("OpenAI provider requires model from config");

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
    }
    const body = (await response.json()) as any;
    return {
      id: body.id ?? createId("openai"),
      provider: this.name,
      model: input.model,
      text: body.choices?.[0]?.message?.content ?? "",
      usage: {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        costUsd: 0,
      },
      metadata: { finishReason: body.choices?.[0]?.finish_reason },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    yield { textDelta: (await this.generate(input)).text, done: true };
  }
}
