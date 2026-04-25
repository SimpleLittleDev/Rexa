import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { loadConfig, type RexaConfigBundle, type StorageConfig } from "./config";
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

export interface RexaRuntime {
  config: RexaConfigBundle;
  agent: MainAgent;
  router: LLMRouter;
  memory: MemoryManager;
  storage: StorageAdapter;
}

export async function createRexaRuntime(rootDir = process.cwd()): Promise<RexaRuntime> {
  const config = await loadConfig(rootDir);
  const storage = createStorage(config.storage, rootDir);
  await storage.connect();
  const memory = new MemoryManager(storage);
  await memory.init();
  const providers = createProviders();
  const router = new LLMRouter(providers, config.models);
  const orchestrator = new Orchestrator(router, memory, config.agents, config.app);
  return {
    config,
    agent: new MainAgent(orchestrator),
    router,
    memory,
    storage,
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

export function createStorage(config: StorageConfig, rootDir = process.cwd()): StorageAdapter {
  if (config.defaultStorage === "memory") return new MemoryStorage();
  if (config.defaultStorage === "sqlite") return new SQLiteStorage(resolveProjectPath(rootDir, config.sqlite.path));
  if (config.defaultStorage === "postgres") {
    const connection = process.env[config.postgres.connectionStringEnv];
    if (!connection) throw new Error(`${config.postgres.connectionStringEnv} is not set`);
    return new PostgresStorage(connection);
  }
  return new JsonStorage(resolveProjectPath(rootDir, config.json.path));
}

export async function ensureProjectDirs(rootDir = process.cwd()): Promise<void> {
  for (const relative of ["data", "logs", "logs/subagents", "config"]) {
    await mkdir(join(rootDir, relative), { recursive: true });
  }
}

function resolveProjectPath(rootDir: string, path: string): string {
  return path.startsWith("/") ? path : join(rootDir, path);
}
