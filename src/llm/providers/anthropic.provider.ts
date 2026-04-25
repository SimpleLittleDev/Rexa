import { createId } from "../../common/result";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse, LLMToolCall } from "../llm-provider.interface";
import { estimateCost } from "../pricing";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly type = "api" as const;

  constructor(
    private readonly apiKeyEnv = "ANTHROPIC_API_KEY",
    private readonly baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1",
    private readonly version = "2023-06-01",
  ) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env[this.apiKeyEnv]);
  }

  async generate(input: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) throw new Error(`${this.apiKeyEnv} is not set`);
    if (!input.model) throw new Error("Anthropic provider requires model from config");

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify(this.buildBody(input, false)),
      signal: input.signal,
    });
    if (!response.ok) {
      throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
    }
    const body = (await response.json()) as any;
    const blocks = Array.isArray(body.content) ? body.content : [];
    const text = blocks
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text ?? "")
      .join("");
    const toolCalls: LLMToolCall[] = blocks
      .filter((block: any) => block.type === "tool_use")
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        arguments: typeof block.input === "string" ? block.input : JSON.stringify(block.input ?? {}),
      }));
    const inputTokens = body.usage?.input_tokens ?? 0;
    const outputTokens = body.usage?.output_tokens ?? 0;
    return {
      id: body.id ?? createId("anthropic"),
      provider: this.name,
      model: input.model,
      text,
      toolCalls,
      usage: {
        inputTokens,
        outputTokens,
        costUsd: estimateCost("anthropic", input.model, inputTokens, outputTokens),
      },
      metadata: { stopReason: body.stop_reason },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) throw new Error(`${this.apiKeyEnv} is not set`);
    if (!input.model) throw new Error("Anthropic provider requires model from config");

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify(this.buildBody(input, true)),
      signal: input.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`Anthropic stream failed: ${response.status} ${await response.text()}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        try {
          const json = JSON.parse(dataLine.slice(5).trim());
          if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
            yield { textDelta: json.delta.text ?? "" };
          } else if (json.type === "message_stop") {
            yield { textDelta: "", done: true };
          }
        } catch {
          // ignore
        }
      }
    }
  }

  private headers(apiKey: string): Record<string, string> {
    return {
      "x-api-key": apiKey,
      "anthropic-version": this.version,
      "content-type": "application/json",
    };
  }

  private buildBody(input: LLMRequest, stream: boolean): Record<string, unknown> {
    const system = input.messages.find((m) => m.role === "system")?.content;
    const messages = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const body: Record<string, unknown> = {
      model: input.model,
      system,
      messages,
      max_tokens: input.maxTokens ?? 4096,
      temperature: input.temperature,
      top_p: input.topP,
      stop_sequences: input.stop,
      stream,
    };
    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
    }
    return body;
  }
}
