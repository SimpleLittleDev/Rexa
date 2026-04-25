import { createId } from "../../common/result";
import type {
  LLMChunk,
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMToolCall,
} from "../llm-provider.interface";
import { estimateCost } from "../pricing";

export interface OpenAIProviderOptions {
  apiKeyEnv?: string;
  organizationEnv?: string;
  projectEnv?: string;
  baseUrl?: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly name: string = "openai";
  readonly type = "api" as const;
  private readonly apiKeyEnv: string;
  private readonly organizationEnv: string;
  private readonly projectEnv: string;
  private readonly baseUrl: string;

  constructor(options: OpenAIProviderOptions = {}) {
    this.apiKeyEnv = options.apiKeyEnv ?? "OPENAI_API_KEY";
    this.organizationEnv = options.organizationEnv ?? "OPENAI_ORG_ID";
    this.projectEnv = options.projectEnv ?? "OPENAI_PROJECT_ID";
    this.baseUrl = options.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
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
      headers: this.headers(apiKey),
      body: JSON.stringify(this.buildBody(input, false)),
      signal: input.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
    }
    const body = (await response.json()) as any;
    const choice = body.choices?.[0];
    const toolCalls: LLMToolCall[] = (choice?.message?.tool_calls ?? []).map((call: any) => ({
      id: call.id,
      name: call.function?.name,
      arguments: call.function?.arguments ?? "{}",
    }));
    const inputTokens = body.usage?.prompt_tokens ?? 0;
    const outputTokens = body.usage?.completion_tokens ?? 0;
    return {
      id: body.id ?? createId("openai"),
      provider: this.name,
      model: input.model,
      text: choice?.message?.content ?? "",
      toolCalls,
      usage: {
        inputTokens,
        outputTokens,
        costUsd: estimateCost("openai", input.model, inputTokens, outputTokens),
      },
      metadata: { finishReason: choice?.finish_reason },
    };
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) throw new Error(`${this.apiKeyEnv} is not set`);
    if (!input.model) throw new Error("OpenAI provider requires model from config");

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify(this.buildBody(input, true)),
      signal: input.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`OpenAI stream failed: ${response.status} ${await response.text()}`);
    }
    for await (const event of parseSSE(response.body)) {
      if (event === "[DONE]") {
        yield { textDelta: "", done: true };
        return;
      }
      try {
        const json = JSON.parse(event);
        const choice = json.choices?.[0];
        const delta = choice?.delta?.content ?? "";
        const toolCallsDelta = choice?.delta?.tool_calls?.[0];
        yield {
          textDelta: delta,
          toolCallDelta: toolCallsDelta
            ? {
                id: toolCallsDelta.id ?? "",
                name: toolCallsDelta.function?.name,
                argumentsDelta: toolCallsDelta.function?.arguments,
              }
            : undefined,
        };
      } catch {
        // ignore malformed line
      }
    }
  }

  private headers(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    };
    const org = process.env[this.organizationEnv];
    if (org) headers["openai-organization"] = org;
    const project = process.env[this.projectEnv];
    if (project) headers["openai-project"] = project;
    return headers;
  }

  private buildBody(input: LLMRequest, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content, name: m.name })),
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      top_p: input.topP,
      stop: input.stop,
      stream,
    };
    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      if (input.toolChoice) {
        body.tool_choice =
          typeof input.toolChoice === "string"
            ? input.toolChoice
            : { type: "function", function: { name: input.toolChoice.name } };
      }
    }
    return body;
  }
}

async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
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
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
    }
  }
}
