import { createId } from "../../common/result";
import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse, LLMToolCall } from "../llm-provider.interface";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  fileData?: { mimeType: string; fileUri: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
}

interface GeminiContent {
  role: "user" | "model" | "tool";
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

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

    const body = this.buildRequest(input);
    const response = await fetch(
      `${this.baseUrl}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: input.signal,
      },
    );
    if (!response.ok) throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
    const json = (await response.json()) as GeminiResponse;
    return this.parseResponse(json, input.model);
  }

  async *stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) throw new Error(`${this.apiKeyEnv} is not set`);
    if (!input.model) throw new Error("Gemini provider requires model from config");

    const body = this.buildRequest(input);
    const response = await fetch(
      `${this.baseUrl}/models/${encodeURIComponent(input.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: input.signal,
      },
    );
    if (!response.ok || !response.body) {
      // Fallback: emit the buffered response as a single chunk.
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
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) continue;
        const payload = dataLine.slice(6).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as GeminiResponse;
          for (const candidate of json.candidates ?? []) {
            for (const part of candidate.content?.parts ?? []) {
              if (part.text) yield { textDelta: part.text };
              if (part.functionCall) {
                yield {
                  textDelta: "",
                  toolCallDelta: {
                    id: createId("call"),
                    name: part.functionCall.name,
                    argumentsDelta: JSON.stringify(part.functionCall.args ?? {}),
                  },
                };
              }
            }
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
    yield { textDelta: "", done: true };
  }

  private buildRequest(input: LLMRequest): Record<string, unknown> {
    const contents: GeminiContent[] = [];
    let systemInstruction: { parts: GeminiPart[] } | undefined;
    for (const message of input.messages) {
      if (message.role === "system") {
        systemInstruction = { parts: [{ text: message.content }] };
        continue;
      }
      if (message.role === "tool") {
        contents.push({
          role: "tool",
          parts: [{ functionResponse: { name: message.name ?? message.toolCallId ?? "tool", response: message.content } }],
        });
        continue;
      }
      const parts: GeminiPart[] = [];
      if (message.content) parts.push({ text: message.content });
      if (message.attachments) {
        for (const attachment of message.attachments) {
          if (attachment.kind === "image") {
            const match = /^data:(image\/[^;]+);base64,(.+)$/.exec(attachment.url);
            if (match) {
              parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
            } else {
              parts.push({ fileData: { mimeType: "image/png", fileUri: attachment.url } });
            }
          }
        }
      }
      contents.push({
        role: message.role === "assistant" ? "model" : "user",
        parts: parts.length ? parts : [{ text: "" }],
      });
    }
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: input.temperature,
        maxOutputTokens: input.maxTokens,
        topP: input.topP,
        stopSequences: input.stop,
      },
    };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    if (input.tools && input.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: input.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })),
        },
      ];
    }
    return body;
  }

  private parseResponse(json: GeminiResponse, model: string): LLMResponse {
    const candidate = json.candidates?.[0];
    let text = "";
    const toolCalls: LLMToolCall[] = [];
    for (const part of candidate?.content?.parts ?? []) {
      if (part.text) text += part.text;
      if (part.functionCall) {
        toolCalls.push({
          id: createId("call"),
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args ?? {}),
        });
      }
    }
    return {
      id: createId("gemini"),
      provider: this.name,
      model,
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
        costUsd: 0,
      },
      metadata: { finishReason: candidate?.finishReason },
    };
  }
}
