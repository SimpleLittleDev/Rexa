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
  tokenSaver: TokenSaverConfig;
  daemon: DaemonConfig;
  multitasking: MultitaskingConfig;
  captcha: CaptchaConfig;
  embeddings: EmbeddingsConfig;
  telemetry: TelemetryConfig;
  mcp: MCPConfig;
  sandbox: SandboxConfig;
  codeIntel: CodeIntelConfig;
}

export interface MCPConfig {
  enabled: boolean;
  /** Server connection list. Stdio-based today; HTTP/SSE later. */
  servers: MCPServerEntry[];
}

export interface MCPServerEntry {
  name: string;
  enabled?: boolean;
  transport?: "stdio";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  toolAllowlist?: string[];
  requestTimeoutMs?: number;
}

export interface SandboxConfig {
  enabled: boolean;
  /** "auto" picks bubblewrap on Linux, sandbox-exec on macOS, job-object on Windows. */
  backend: "auto" | "bubblewrap" | "sandbox-exec" | "firejail" | "job-object" | "none";
  /** Default per-execution wall-clock timeout. */
  defaultTimeoutMs: number;
  /** Default memory cap in MB (best-effort, depends on backend). */
  memoryLimitMb: number;
  /** Default CPU cap (best-effort). */
  cpuLimit: number;
  /** Allow network access from inside the sandbox. */
  allowNetwork: boolean;
  /** Whitelisted writable paths (sandbox-relative). */
  writablePaths: string[];
}

export interface CodeIntelConfig {
  enabled: boolean;
  /** Optional language servers to spawn on demand. */
  languageServers: LanguageServerEntry[];
  /** Tree-sitter WASM module directory. */
  treeSitterWasmDir: string;
}

export interface LanguageServerEntry {
  name: string;
  /** Languages this server is invoked for (LSP languageId). */
  languages: string[];
  command: string;
  args?: string[];
  rootMarker?: string[];
}

export interface TokenSaverConfig {
  /** Enable global token-saver mode (smaller models, shorter context, fewer steps). */
  enabled: boolean;
  /** Force every role to map to the cheap role bundle when enabled. */
  preferCheapRole: boolean;
  /** Max planner steps when token-saver is on. */
  maxPlannerSteps: number;
  /** Max history turns kept in context when token-saver is on. */
  maxHistoryTurns: number;
  /** Disable streaming responses (avoids extra metadata). */
  disableStreaming: boolean;
  /** Skip optional tool-calling unless the planner explicitly demands it. */
  disableOptionalTools: boolean;
}

export interface DaemonConfig {
  enabled: boolean;
  /** Where the daemon writes its socket / pid file. */
  runtimeDir: string;
  /** SQLite-backed task queue. */
  queuePath: string;
  /** Heartbeat interval. */
  heartbeatMs: number;
}

export interface MultitaskingConfig {
  /** Default concurrency cap for task scheduler. */
  concurrency: number;
  /** Sub-agent pool size used by daemon for parallel work. */
  subAgentPoolSize: number;
  /** Per-task default timeout. */
  defaultTimeoutMs: number;
}

export interface CaptchaConfig {
  enabled: boolean;
  /** Provider order: 2captcha, anticaptcha, vision-llm. */
  providers: Array<"2captcha" | "anticaptcha" | "capsolver" | "vision-llm">;
  apiKeyEnv: { twoCaptcha: string; antiCaptcha: string; capSolver: string };
  /** Polling interval for solver result. */
  pollIntervalMs: number;
  /** Max wait for solver. */
  maxWaitMs: number;
}

export interface EmbeddingsConfig {
  enabled: boolean;
  provider: "openai" | "voyage" | "ollama" | "mock";
  model: string;
  /** Dimensions of the model output (used by storage). */
  dimensions: number;
  apiKeyEnv: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  /** JSONL log path relative to Rexa home. */
  logPath: string;
  /** Persist cost rollups to storage. */
  persistCost: boolean;
}

export interface ChatProvidersConfig {
  cli: { enabled: boolean };
  telegram: { enabled: boolean; tokenEnv: string };
  whatsapp: {
    enabled: boolean;
    /** Local directory for the multi-file auth state (Baileys). */
    authDir: string;
    /** Browser identifier shown in WhatsApp Linked Devices. */
    browserName: string;
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
        authDir: "data/whatsapp/auth",
        browserName: "Rexa",
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
    tokenSaver: {
      enabled: parseEnvBool(process.env.REXA_TOKEN_SAVER, false),
      preferCheapRole: true,
      maxPlannerSteps: 3,
      maxHistoryTurns: 6,
      disableStreaming: true,
      disableOptionalTools: true,
    },
    daemon: {
      enabled: false,
      runtimeDir: "data/daemon",
      queuePath: "data/daemon/tasks.sqlite",
      heartbeatMs: 5_000,
    },
    multitasking: {
      concurrency: 4,
      subAgentPoolSize: 4,
      defaultTimeoutMs: 600_000,
    },
    captcha: {
      enabled: true,
      providers: ["2captcha", "anticaptcha", "capsolver", "vision-llm"],
      apiKeyEnv: {
        twoCaptcha: "TWOCAPTCHA_API_KEY",
        antiCaptcha: "ANTICAPTCHA_API_KEY",
        capSolver: "CAPSOLVER_API_KEY",
      },
      pollIntervalMs: 5_000,
      maxWaitMs: 180_000,
    },
    embeddings: {
      enabled: true,
      provider: "openai",
      model: "text-embedding-3-small",
      dimensions: 1536,
      apiKeyEnv: "OPENAI_API_KEY",
    },
    telemetry: {
      enabled: parseEnvBool(process.env.REXA_TELEMETRY, true),
      logPath: "logs/telemetry.jsonl",
      persistCost: true,
    },
    mcp: {
      enabled: true,
      servers: [],
    },
    sandbox: {
      enabled: parseEnvBool(process.env.REXA_SANDBOX, true),
      backend: "auto",
      defaultTimeoutMs: 60_000,
      memoryLimitMb: 1024,
      cpuLimit: 1,
      allowNetwork: false,
      writablePaths: ["data/sandbox"],
    },
    codeIntel: {
      enabled: true,
      languageServers: [],
      treeSitterWasmDir: "data/tree-sitter",
    },
  };
}

function parseEnvBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
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
