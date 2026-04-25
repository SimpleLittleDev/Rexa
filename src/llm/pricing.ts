/**
 * Best-effort pricing estimate per 1K tokens (USD). Numbers are approximate
 * defaults so cost tracking has a baseline; configure your own pricing via
 * REXA_PRICING_OVERRIDE env (JSON map) when you need precision.
 */
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  "openai:gpt-4.1": { input: 2.0 / 1000, output: 8.0 / 1000 },
  "openai:gpt-4.1-mini": { input: 0.4 / 1000, output: 1.6 / 1000 },
  "openai:gpt-4o": { input: 2.5 / 1000, output: 10.0 / 1000 },
  "openai:gpt-4o-mini": { input: 0.15 / 1000, output: 0.6 / 1000 },
  "anthropic:claude-sonnet-4-20250514": { input: 3.0 / 1000, output: 15.0 / 1000 },
  "anthropic:claude-opus-4-20250514": { input: 15.0 / 1000, output: 75.0 / 1000 },
  "anthropic:claude-haiku-4-20250514": { input: 0.8 / 1000, output: 4.0 / 1000 },
  "google:gemini-2.5-pro": { input: 1.25 / 1000, output: 5.0 / 1000 },
  "google:gemini-2.5-flash": { input: 0.075 / 1000, output: 0.3 / 1000 },
  "openrouter:auto": { input: 1.0 / 1000, output: 3.0 / 1000 },
};

let CACHED_OVERRIDE: Record<string, { input: number; output: number }> | null = null;

function loadOverride(): Record<string, { input: number; output: number }> {
  if (CACHED_OVERRIDE) return CACHED_OVERRIDE;
  const raw = process.env.REXA_PRICING_OVERRIDE;
  if (!raw) {
    CACHED_OVERRIDE = {};
    return CACHED_OVERRIDE;
  }
  try {
    CACHED_OVERRIDE = JSON.parse(raw) as Record<string, { input: number; output: number }>;
  } catch {
    CACHED_OVERRIDE = {};
  }
  return CACHED_OVERRIDE;
}

export function estimateCost(provider: string, model: string | undefined, inputTokens: number, outputTokens: number): number {
  if (!model) return 0;
  const key = `${provider}:${model}`;
  const override = loadOverride()[key];
  const fallback = DEFAULT_PRICING[key];
  const pricing = override ?? fallback;
  if (!pricing) return 0;
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}
