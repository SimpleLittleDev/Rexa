export type LLMProviderType = "api" | "cli" | "oauth" | "local";

export interface LLMAttachment {
  /** "image" is the only kind currently supported by OpenAI/Anthropic/Gemini multimodal endpoints. */
  kind: "image";
  /** Either a data URI (`data:image/png;base64,...`) or a remote https URL. */
  url: string;
  /** Optional caption / alt text. */
  detail?: "auto" | "low" | "high";
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  /** Optional multimodal attachments (images for vision tasks). */
  attachments?: LLMAttachment[];
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  tools?: LLMToolDefinition[];
  toolChoice?: "auto" | "none" | "required" | { name: string };
  metadata?: Record<string, unknown>;
  /** AbortSignal lets callers cancel mid-flight (timeouts, user interrupt). */
  signal?: AbortSignal;
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
  toolCalls?: LLMToolCall[];
  usage: LLMUsage;
  metadata: Record<string, unknown>;
}

export interface LLMChunk {
  textDelta: string;
  toolCallDelta?: { id: string; name?: string; argumentsDelta?: string };
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
