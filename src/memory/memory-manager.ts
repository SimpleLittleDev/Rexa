import { createId } from "../common/result";
import type { StorageAdapter } from "../storage/storage-adapter.interface";

export type MemoryScope = "global" | "project" | "task" | "subagent";

export interface MemoryRecord {
  id: string;
  scope: MemoryScope | string;
  type: string;
  text: string;
  importance: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface RememberInput {
  scope: MemoryRecord["scope"];
  type: string;
  text: string;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RetrieveOptions {
  scope?: string;
  limit?: number;
}

export class MemoryManager {
  constructor(private readonly storage: StorageAdapter) {}

  async init(): Promise<void> {
    await this.storage.connect();
  }

  async remember(input: RememberInput): Promise<MemoryRecord> {
    const now = new Date().toISOString();
    const record: MemoryRecord = {
      id: createId("mem"),
      scope: input.scope,
      type: input.type,
      text: input.text,
      importance: input.importance ?? 0.5,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
    await this.storage.set("memory", record.id, record);
    return record;
  }

  async retrieve(query: string, options: RetrieveOptions = {}): Promise<MemoryRecord[]> {
    const records = await this.storage.query<MemoryRecord>("memory", options.scope ? { where: { scope: options.scope } } : {});
    return records
      .map((record) => ({ record, score: this.score(record, query) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 8)
      .map((item) => item.record);
  }

  async summarize(query: string, options: RetrieveOptions = {}): Promise<string> {
    const memories = await this.retrieve(query, { limit: options.limit ?? 5, scope: options.scope });
    return memories.map((memory) => `- [${memory.type}] ${memory.text}`).join("\n");
  }

  /**
   * Recent chronological turns within a scope. Useful for chat history
   * retrieval where ordering matters more than semantic similarity.
   */
  async recentTurns(scope: string, limit = 10): Promise<MemoryRecord[]> {
    const records = await this.storage.query<MemoryRecord>("memory", { where: { scope } });
    return records
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .reverse();
  }

  private score(record: MemoryRecord, query: string): number {
    const queryTokens = tokenize(query);
    const haystack = tokenize(`${record.text} ${record.tags.join(" ")} ${record.type}`);
    const overlap = [...queryTokens].filter((token) => haystack.has(token)).length;
    const ageMs = Date.now() - new Date(record.updatedAt).getTime();
    const recency = Math.max(0, 1 - ageMs / (1000 * 60 * 60 * 24 * 30));
    return overlap * 2 + record.importance + recency * 0.25;
  }
}

function tokenize(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9_.-]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  );
}
