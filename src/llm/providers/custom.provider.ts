import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "../llm-provider.interface";

export class CustomProvider implements LLMProvider {
  readonly type = "api" as const;

  constructor(
    readonly name: string,
    private readonly delegate: LLMProvider,
  ) {}

  isAvailable(): Promise<boolean> {
    return this.delegate.isAvailable();
  }

  generate(input: LLMRequest): Promise<LLMResponse> {
    return this.delegate.generate(input);
  }

  stream(input: LLMRequest): AsyncGenerator<LLMChunk> {
    return this.delegate.stream(input);
  }
}
