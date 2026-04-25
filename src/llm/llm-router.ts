import type { LLMChunk, LLMProvider, LLMRequest, LLMResponse } from "./llm-provider.interface";

export interface ModelSelection {
  provider: string;
  model: string;
}

export interface ModelsRouterConfig {
  roles: Record<string, ModelSelection & { fallbackProviders?: string[] }>;
  fallbackOrder?: string[];
}

export interface RouterPolicy {
  /** Max attempts per provider before giving up. */
  maxRetriesPerProvider?: number;
  /** Initial delay in ms for exponential backoff. */
  retryBaseDelayMs?: number;
  /** Threshold of consecutive failures before opening the circuit for a provider. */
  circuitBreakerThreshold?: number;
  /** Cooldown in ms before retrying a tripped provider. */
  circuitBreakerCooldownMs?: number;
  /** Notified for telemetry. */
  onAttempt?: (info: { role: string; provider: string; model: string; attempt: number }) => void;
  onError?: (info: { role: string; provider: string; model: string; error: Error }) => void;
  /** Notified after a successful (or finally-failed) response with full usage info. */
  onComplete?: (info: {
    role: string;
    provider: string;
    model: string;
    success: boolean;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    error?: string;
  }) => void;
}

interface ProviderHealth {
  consecutiveFailures: number;
  openedAt: number | null;
}

export class LLMRouter {
  private readonly health = new Map<string, ProviderHealth>();
  private readonly policy: Required<Omit<RouterPolicy, "onAttempt" | "onError" | "onComplete">> &
    Pick<RouterPolicy, "onAttempt" | "onError" | "onComplete">;

  constructor(
    private readonly providers: Record<string, LLMProvider>,
    private readonly config: ModelsRouterConfig,
    policy: RouterPolicy = {},
  ) {
    this.policy = {
      maxRetriesPerProvider: policy.maxRetriesPerProvider ?? 2,
      retryBaseDelayMs: policy.retryBaseDelayMs ?? 250,
      circuitBreakerThreshold: policy.circuitBreakerThreshold ?? 3,
      circuitBreakerCooldownMs: policy.circuitBreakerCooldownMs ?? 30_000,
      onAttempt: policy.onAttempt,
      onError: policy.onError,
      onComplete: policy.onComplete,
    };
  }

  async generateForRole(role: string, request: LLMRequest): Promise<LLMResponse> {
    const candidates = this.candidatesForRole(role);
    const errors: string[] = [];

    for (const candidate of candidates) {
      const provider = this.providers[candidate.provider];
      if (!provider) {
        errors.push(`${candidate.provider}: provider not registered`);
        continue;
      }
      if (this.isCircuitOpen(candidate.provider)) {
        errors.push(`${candidate.provider}: circuit open`);
        continue;
      }
      try {
        if (!(await provider.isAvailable())) {
          errors.push(`${candidate.provider}: provider unavailable`);
          continue;
        }
      } catch (error) {
        errors.push(`${candidate.provider}: availability check failed: ${formatError(error)}`);
        continue;
      }

      for (let attempt = 1; attempt <= this.policy.maxRetriesPerProvider; attempt += 1) {
        this.policy.onAttempt?.({ role, provider: candidate.provider, model: candidate.model, attempt });
        const startedAt = Date.now();
        try {
          const response = await provider.generate({ ...request, model: candidate.model });
          this.recordSuccess(candidate.provider);
          this.policy.onComplete?.({
            role,
            provider: candidate.provider,
            model: candidate.model,
            success: true,
            durationMs: Date.now() - startedAt,
            inputTokens: response.usage?.inputTokens ?? 0,
            outputTokens: response.usage?.outputTokens ?? 0,
            costUsd: response.usage?.costUsd ?? 0,
          });
          return response;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.recordFailure(candidate.provider);
          this.policy.onError?.({ role, provider: candidate.provider, model: candidate.model, error: err });
          this.policy.onComplete?.({
            role,
            provider: candidate.provider,
            model: candidate.model,
            success: false,
            durationMs: Date.now() - startedAt,
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            error: err.message,
          });
          errors.push(`${candidate.provider}#${attempt}: ${err.message}`);
          if (attempt < this.policy.maxRetriesPerProvider) {
            await sleep(this.policy.retryBaseDelayMs * 2 ** (attempt - 1));
          }
        }
      }
    }

    throw new Error(`No provider could fulfil role '${role}'. Tried: ${errors.join(" | ")}`);
  }

  async *streamForRole(role: string, request: LLMRequest): AsyncGenerator<LLMChunk> {
    const candidates = this.candidatesForRole(role);
    const errors: string[] = [];
    for (const candidate of candidates) {
      const provider = this.providers[candidate.provider];
      if (!provider) {
        errors.push(`${candidate.provider}: provider not registered`);
        continue;
      }
      if (this.isCircuitOpen(candidate.provider)) continue;
      try {
        if (!(await provider.isAvailable())) continue;
        for await (const chunk of provider.stream({ ...request, model: candidate.model })) {
          yield chunk;
        }
        this.recordSuccess(candidate.provider);
        return;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.recordFailure(candidate.provider);
        errors.push(`${candidate.provider}: ${err.message}`);
        this.policy.onError?.({ role, provider: candidate.provider, model: candidate.model, error: err });
      }
    }
    throw new Error(`Streaming failed for role '${role}'. Tried: ${errors.join(" | ")}`);
  }

  async generateForProvider(selection: ModelSelection, request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers[selection.provider];
    if (!provider) throw new Error(`Provider '${selection.provider}' is not registered`);
    if (this.isCircuitOpen(selection.provider)) {
      throw new Error(`Provider '${selection.provider}' is temporarily unavailable (circuit open)`);
    }
    if (!(await provider.isAvailable())) {
      throw new Error(`Provider '${selection.provider}' is unavailable`);
    }
    try {
      const response = await provider.generate({ ...request, model: selection.model });
      this.recordSuccess(selection.provider);
      return response;
    } catch (error) {
      this.recordFailure(selection.provider);
      throw error;
    }
  }

  candidatesForRole(role: string): Array<ModelSelection> {
    const roleConfig = this.config.roles[role] ?? this.config.roles.main ?? this.config.roles.fallback;
    if (!roleConfig) {
      throw new Error(`No model config found for role '${role}' and no fallback configured`);
    }
    const seen = new Set<string>();
    const candidates: Array<ModelSelection> = [];
    const push = (provider: string, model: string) => {
      const key = `${provider}::${model}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ provider, model });
    };
    push(roleConfig.provider, roleConfig.model);
    for (const provider of roleConfig.fallbackProviders ?? []) {
      push(provider, roleConfig.model);
    }
    for (const provider of this.config.fallbackOrder ?? []) {
      push(provider, this.config.roles.fallback?.model ?? roleConfig.model);
    }
    return candidates;
  }

  private isCircuitOpen(provider: string): boolean {
    const health = this.health.get(provider);
    if (!health || health.openedAt === null) return false;
    if (Date.now() - health.openedAt > this.policy.circuitBreakerCooldownMs) {
      health.openedAt = null;
      health.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  private recordSuccess(provider: string): void {
    this.health.set(provider, { consecutiveFailures: 0, openedAt: null });
  }

  private recordFailure(provider: string): void {
    const current = this.health.get(provider) ?? { consecutiveFailures: 0, openedAt: null };
    current.consecutiveFailures += 1;
    if (current.consecutiveFailures >= this.policy.circuitBreakerThreshold) {
      current.openedAt = Date.now();
    }
    this.health.set(provider, current);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
