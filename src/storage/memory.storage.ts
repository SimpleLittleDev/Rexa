import type { StorageAdapter, StorageFilter } from "./storage-adapter.interface";

export class MemoryStorage implements StorageAdapter {
  readonly name = "memory";
  private readonly collections = new Map<string, Map<string, unknown>>();

  async connect(): Promise<void> {
    return;
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    return (this.collections.get(collection)?.get(id) as T | undefined) ?? null;
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    this.collection(collection).set(id, value);
  }

  async delete(collection: string, id: string): Promise<void> {
    this.collections.get(collection)?.delete(id);
  }

  async query<T>(collection: string, filter: StorageFilter = {}): Promise<T[]> {
    const values = [...(this.collections.get(collection)?.values() ?? [])] as T[];
    const filtered = values.filter((value) => matchesWhere(value, filter.where));
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  async close(): Promise<void> {
    return;
  }

  private collection(name: string): Map<string, unknown> {
    let existing = this.collections.get(name);
    if (!existing) {
      existing = new Map<string, unknown>();
      this.collections.set(name, existing);
    }
    return existing;
  }
}

export function matchesWhere(value: unknown, where?: Record<string, unknown>): boolean {
  if (!where) return true;
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Object.entries(where).every(([key, expected]) => record[key] === expected);
}
