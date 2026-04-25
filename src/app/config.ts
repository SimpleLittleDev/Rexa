import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PermissionMode } from "../security/permissions";
import type { ModelsRouterConfig } from "../llm/llm-router";
import type { SubAgentConfig } from "../subagents/subagent";

export interface AppConfig {
  name: string;
  version: string;
  permissionMode: PermissionMode;
  maxToolCallsPerTask: number;
  maxSubAgents: number;
  maxRetries: number;
  maxExecutionTimeMs: number;
  maxLLMCostPerTask: number;
  maxMemoryChunks: number;
  enabledChatProviders: string[];
  browserMode: "chromium" | "playwright" | "remote-browser" | "auto" | "limited";
  chatProviders: ChatProvidersConfig;
  browserAgent: BrowserAgentConfig;
}

export interface ChatProvidersConfig {
  cli: { enabled: boolean };
  telegram: { enabled: boolean; tokenEnv: string };
  whatsapp: {
    enabled: boolean;
    mode: "cloud-api" | "webhook-only";
    accessTokenEnv: string;
    phoneNumberIdEnv: string;
    verifyTokenEnv: string;
    port: number;
  };
  rest: { enabled: boolean; port: number };
  websocket: { enabled: boolean; port: number };
  web: { enabled: boolean; port: number };
}

export interface BrowserAgentConfig {
  enabled: boolean;
  pointerEnabled: boolean;
  screenshotUpdates: boolean;
  screenshotDir: string;
  updateAfterActions: Array<"open" | "click" | "moveMouse" | "type" | "scroll" | "uploadFile">;
}

export interface AgentsConfig {
  mainAgent: SubAgentConfig & {
    memoryScope: "global" | string;
  };
  subAgentPolicy: {
    enabled: boolean;
    sameProviderAsMain: boolean;
    maxAgents: number;
    allowedTools: string[];
    defaultMemoryScope: "task-only" | "read-only" | string;
    defaultBudget: NonNullable<SubAgentConfig["budget"]>;
  };
}

export interface StorageConfig {
  defaultStorage: "json" | "sqlite" | "postgres" | "memory";
  availableStorage: string[];
  json: { path: string };
  sqlite: { path: string };
  postgres: { connectionStringEnv: string };
  vector: { provider: string; path: string };
}

export interface RexaConfigBundle {
  app: AppConfig;
  models: ModelsRouterConfig;
  agents: AgentsConfig;
  storage: StorageConfig;
}

export async function loadConfig(rootDir = process.cwd()): Promise<RexaConfigBundle> {
  return {
    app: mergeDeep(defaultAppConfig(), await loadJson("app.config.json", {}, rootDir)),
    models: mergeDeep(defaultModelsConfig(), await loadJson("models.config.json", {}, rootDir)),
    agents: mergeDeep(defaultAgentsConfig(), await loadJson("agents.config.json", {}, rootDir)),
    storage: mergeDeep(defaultStorageConfig(), await loadJson("storage.config.json", {}, rootDir)),
  };
}

async function loadJson<T>(fileName: string, fallback: T, rootDir: string): Promise<T> {
  try {
    return JSON.parse(await readFile(join(rootDir, "config", fileName), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function mergeDeep<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return (override === undefined ? base : override) as T;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? mergeDeep(current, value) : value;
  }
  return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function defaultAppConfig(): AppConfig {
  return {
    name: "Rexa",
    version: "0.2.0",
    permissionMode: "balanced",
    maxToolCallsPerTask: 30,
    maxSubAgents: 3,
    maxRetries: 2,
    maxExecutionTimeMs: 600_000,
    maxLLMCostPerTask: 1,
    maxMemoryChunks: 8,
    enabledChatProviders: ["cli"],
    browserMode: "auto",
    chatProviders: {
      cli: { enabled: true },
      telegram: { enabled: false, tokenEnv: "TELEGRAM_BOT_TOKEN" },
      whatsapp: {
        enabled: false,
        mode: "cloud-api",
        accessTokenEnv: "WHATSAPP_ACCESS_TOKEN",
        phoneNumberIdEnv: "WHATSAPP_PHONE_NUMBER_ID",
        verifyTokenEnv: "WHATSAPP_VERIFY_TOKEN",
        port: 8792,
      },
      rest: { enabled: true, port: 8786 },
      websocket: { enabled: false, port: 8788 },
      web: { enabled: false, port: 8787 },
    },
    browserAgent: {
      enabled: true,
      pointerEnabled: true,
      screenshotUpdates: true,
      screenshotDir: "data/browser-screenshots",
      updateAfterActions: ["open", "click", "moveMouse", "type", "scroll", "uploadFile"],
    },
  };
}

export function defaultModelsConfig(): ModelsRouterConfig {
  return {
    roles: {
      main: { provider: "openai", model: "gpt-4.1", fallbackProviders: ["anthropic", "openrouter", "ollama", "mock"] },
      coding: { provider: "anthropic", model: "claude-sonnet-4-20250514", fallbackProviders: ["openai", "openrouter", "mock"] },
      browser: { provider: "openai", model: "gpt-4.1", fallbackProviders: ["anthropic", "openrouter", "mock"] },
      research: { provider: "openai", model: "gpt-4.1", fallbackProviders: ["anthropic", "openrouter", "mock"] },
      cheap: { provider: "openai", model: "gpt-4.1-mini", fallbackProviders: ["openrouter", "ollama", "mock"] },
      fallback: { provider: "mock", model: "local-mock-fallback" },
    },
    fallbackOrder: ["openai", "anthropic", "openrouter", "ollama", "mock"],
  };
}

export function defaultAgentsConfig(): AgentsConfig {
  return {
    mainAgent: {
      name: "Rexa",
      role: "main-orchestrator",
      provider: "openai",
      model: "gpt-4.1",
      tools: ["browser", "terminal", "file", "memory", "subagent"],
      memoryScope: "global",
      budget: { maxToolCalls: 30, maxExecutionTimeMs: 600_000, maxCostUsd: 1 },
    },
    subAgentPolicy: {
      enabled: true,
      sameProviderAsMain: true,
      maxAgents: 3,
      allowedTools: ["browser", "terminal", "file", "memory"],
      defaultMemoryScope: "task-only",
      defaultBudget: { maxToolCalls: 10, maxExecutionTimeMs: 300_000, maxCostUsd: 0.5 },
    },
  };
}

export function defaultStorageConfig(): StorageConfig {
  return {
    defaultStorage: "json",
    availableStorage: ["json", "sqlite", "postgres", "memory"],
    json: { path: "data/storage.json" },
    sqlite: { path: "data/rexa.sqlite" },
    postgres: { connectionStringEnv: "DATABASE_URL" },
    vector: { provider: "local", path: "data/vector.json" },
  };
}
