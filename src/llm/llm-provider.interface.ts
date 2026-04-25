export type LLMProviderType = "api" | "cli" | "oauth" | "local";

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LLMResponse {
  id: string;
  provider: string;
  model?: string;
  text: string;
  usage: LLMUsage;
  metadata: Record<string, unknown>;
}

export interface LLMChunk {
  textDelta: string;
  done?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LLMProvider {
  name: string;
  type: LLMProviderType;
  isAvailable(): Promise<boolean>;
  generate(input: LLMRequest): Promise<LLMResponse>;
  stream(input: LLMRequest): AsyncGenerator<LLMChunk>;
}
