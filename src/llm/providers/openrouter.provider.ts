import { OpenAIProvider } from "./openai.provider";

export class OpenRouterProvider extends OpenAIProvider {
  override readonly name = "openrouter";

  constructor() {
    super({
      apiKeyEnv: "OPENROUTER_API_KEY",
      baseUrl: "https://openrouter.ai/api/v1",
    });
  }
}
