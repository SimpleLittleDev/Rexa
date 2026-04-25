import { createId } from "../../common/result";
import type { LLMChunk, LLMMessage, LLMProvider, LLMRequest, LLMResponse, LLMToolCall } from "../llm-provider.interface";

interface OllamaToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

interface OllamaChatStreamChunk {
  model?: string;
  created_at?: string;
  message?: { role: string; content: string; tool_calls?: OllamaToolCall[] };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama HTTP provider using the `/api/chat` endpoint.
 *
 * Streams NDJSON chunks for `stream()` and supports the function-calling
 * payload that recent Ollama versions accept (Llama 3.1+, Qwen2.5, etc).
 * Falls back to text-only when the local model doesn't expose tools.
 */
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
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(this.buildBody(input, false)),
      signal: input.signal,
    });
    if (!response.ok) throw new Error(`Ollama request failed: ${response.status} ${await response.text()}`);
    const json = (await response.json()) as OllamaChatStreamChunk;
    const toolCalls: LLMToolCall[] = (json.message?.tool_calls ?? []).map((call) => ({
      id: createId("call"),
      name: call.function.name,
      arguments: JSON.stringify(call.function.arguments ?? {}),
    }));
    return {
      id: createId("ollama"),
      provider: this.name,
      model: input.model,
      text: json.message?.content ?? "",
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: json.prompt_eval_count ?? 0,
        outputTokens: json.eval_count ?? 0,
        costUsd: 0,
      },
      metadata: { done: json.done },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    if (!input.model) throw new Error("Ollama provider requires model from config");
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(this.buildBody(input, true)),
      signal: input.signal,
    });
    if (!response.ok || !response.body) {
      const full = await this.generate(input);
      yield { textDelta: full.text, done: true, metadata: { fallback: true } };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed) as OllamaChatStreamChunk;
          if (json.message?.content) yield { textDelta: json.message.content };
          for (const call of json.message?.tool_calls ?? []) {
            yield {
              textDelta: "",
              toolCallDelta: {
                id: createId("call"),
                name: call.function.name,
                argumentsDelta: JSON.stringify(call.function.arguments ?? {}),
              },
            };
          }
          if (json.done) {
            yield { textDelta: "", done: true };
            return;
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
    yield { textDelta: "", done: true };
  }

  private buildBody(input: LLMRequest, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages.map(translateMessage),
      stream,
      options: {
        temperature: input.temperature,
        top_p: input.topP,
        num_predict: input.maxTokens,
        stop: input.stop,
      },
    };
    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }
    return body;
  }
}

function translateMessage(message: LLMMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return { role: "tool", content: message.content, name: message.name, tool_call_id: message.toolCallId };
  }
  return { role: message.role, content: message.content };
}
