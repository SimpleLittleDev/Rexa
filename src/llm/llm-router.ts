import type { LLMProvider, LLMRequest, LLMResponse } from "./llm-provider.interface";

export interface ModelSelection {
  provider: string;
  model: string;
}

export interface ModelsRouterConfig {
  roles: Record<string, ModelSelection & { fallbackProviders?: string[] }>;
  fallbackOrder?: string[];
}

export class LLMRouter {
  constructor(
    private readonly providers: Record<string, LLMProvider>,
    private readonly config: ModelsRouterConfig,
  ) {}

  async generateForRole(role: string, request: LLMRequest): Promise<LLMResponse> {
    const roleConfig = this.config.roles[role] ?? this.config.roles.main ?? this.config.roles.fallback;
    if (!roleConfig) {
      throw new Error(`No model config found for role '${role}' and no fallback configured`);
    }

    const candidates = this.candidatesFor(roleConfig);
    const errors: string[] = [];

    for (const candidate of candidates) {
      const provider = this.providers[candidate.provider];
      if (!provider) {
        errors.push(`${candidate.provider}: provider not registered`);
        continue;
      }

      try {
        if (!(await provider.isAvailable())) {
          errors.push(`${candidate.provider}: provider unavailable`);
          continue;
        }

        return await provider.generate({ ...request, model: candidate.model });
      } catch (error) {
        errors.push(`${candidate.provider}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`All LLM providers failed: ${errors.join("; ")}`);
  }

  async generateForProvider(selection: ModelSelection, request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers[selection.provider];
    if (!provider) {
      throw new Error(`Provider '${selection.provider}' is not registered`);
    }
    if (!(await provider.isAvailable())) {
      throw new Error(`Provider '${selection.provider}' is not available`);
    }
    return provider.generate({ ...request, model: selection.model });
  }

  listProviders(): string[] {
    return Object.keys(this.providers);
  }

  private candidatesFor(roleConfig: ModelSelection & { fallbackProviders?: string[] }): ModelSelection[] {
    const providerNames = [
      roleConfig.provider,
      ...(roleConfig.fallbackProviders ?? []),
      ...(this.config.fallbackOrder ?? []),
    ];
    const deduped = [...new Set(providerNames)];
    return deduped.map((providerName) => ({
      provider: providerName,
      model: this.modelForProvider(providerName, roleConfig),
    }));
  }

  private modelForProvider(
    providerName: string,
    roleConfig: ModelSelection & { fallbackProviders?: string[] },
  ): string {
    const fallbackRole = this.config.roles.fallback;
    if (fallbackRole?.provider === providerName) return fallbackRole.model;
    const providerSpecific = Object.values(this.config.roles).find((value) => value.provider === providerName);
    return providerSpecific?.model ?? roleConfig.model;
  }
}
