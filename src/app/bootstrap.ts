import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { loadConfig, type RexaConfigBundle, type StorageConfig } from "./config";
import { resolveRexaHome } from "./paths";
import { MainAgent } from "../agent/main-agent";
import { Orchestrator } from "../agent/orchestrator";
import { LLMRouter } from "../llm/llm-router";
import type { LLMProvider } from "../llm/llm-provider.interface";
import { AnthropicProvider } from "../llm/providers/anthropic.provider";
import { ClaudeCodeProvider } from "../llm/providers/claude-code.provider";
import { CodexCLIProvider } from "../llm/providers/codex-cli.provider";
import { GeminiProvider } from "../llm/providers/gemini.provider";
import { MockProvider } from "../llm/providers/mock.provider";
import { OllamaProvider } from "../llm/providers/ollama.provider";
import { OpenAIProvider } from "../llm/providers/openai.provider";
import { OpenRouterProvider } from "../llm/providers/openrouter.provider";
import { MemoryManager } from "../memory/memory-manager";
import { JsonStorage } from "../storage/json.storage";
import { MemoryStorage } from "../storage/memory.storage";
import { PostgresStorage } from "../storage/postgres.storage";
import { SQLiteStorage } from "../storage/sqlite.storage";
import type { StorageAdapter } from "../storage/storage-adapter.interface";
import { Telemetry } from "../logs/telemetry";
import { MCPRegistry } from "../mcp/mcp-registry";
import { SandboxManager } from "../security/sandbox";

export interface RexaRuntime {
  config: RexaConfigBundle;
  agent: MainAgent;
  router: LLMRouter;
  memory: MemoryManager;
  storage: StorageAdapter;
  telemetry: Telemetry;
  mcp: MCPRegistry;
  sandbox: SandboxManager;
}

export async function createRexaRuntime(rootDir = resolveRexaHome()): Promise<RexaRuntime> {
  const config = await loadConfig(rootDir);
  const storage = createStorage(config.storage, rootDir);
  await storage.connect();
  const memory = new MemoryManager(storage);
  await memory.init();
  const providers = createProviders();
  const telemetryConfig = {
    ...config.app.telemetry,
    logPath: resolveProjectPath(rootDir, config.app.telemetry.logPath),
  };
  const telemetry = new Telemetry(telemetryConfig);
  const router = new LLMRouter(providers, config.models, {
    onComplete: (info) => {
      // Telemetry is fire-and-forget by design.
      void telemetry.record({
        provider: info.provider,
        model: info.model,
        role: info.role,
        inputTokens: info.inputTokens,
        outputTokens: info.outputTokens,
        costUsd: info.costUsd,
        success: info.success,
        durationMs: info.durationMs,
        error: info.error,
      });
    },
  });
  const sandbox = new SandboxManager(config.app.sandbox);
  const mcp = new MCPRegistry();
  if (config.app.mcp.enabled && config.app.mcp.servers.length > 0) {
    // Connect MCP servers in the background — failures shouldn't block boot.
    void mcp.connectAll(config.app.mcp.servers);
  }
  const orchestrator = new Orchestrator(router, memory, config.agents, config.app);
  return {
    config,
    agent: new MainAgent(orchestrator),
    router,
    memory,
    storage,
    telemetry,
    mcp,
    sandbox,
  };
}

export function createProviders(): Record<string, LLMProvider> {
  return {
    mock: new MockProvider(),
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    gemini: new GeminiProvider(),
    ollama: new OllamaProvider(),
    openrouter: new OpenRouterProvider(),
    "codex-cli": new CodexCLIProvider(),
    "claude-code": new ClaudeCodeProvider(),
  };
}

export function createStorage(config: StorageConfig, rootDir = resolveRexaHome()): StorageAdapter {
  if (config.defaultStorage === "memory") return new MemoryStorage();
  if (config.defaultStorage === "sqlite") return new SQLiteStorage(resolveProjectPath(rootDir, config.sqlite.path));
  if (config.defaultStorage === "postgres") {
    const connection = process.env[config.postgres.connectionStringEnv];
    if (!connection) throw new Error(`${config.postgres.connectionStringEnv} is not set`);
    return new PostgresStorage(connection);
  }
  return new JsonStorage(resolveProjectPath(rootDir, config.json.path));
}

export async function ensureProjectDirs(rootDir = resolveRexaHome()): Promise<void> {
  for (const relative of ["data", "logs", "logs/subagents", "config"]) {
    await mkdir(join(rootDir, relative), { recursive: true });
  }
}

function resolveProjectPath(rootDir: string, path: string): string {
  return path.startsWith("/") ? path : join(rootDir, path);
}
