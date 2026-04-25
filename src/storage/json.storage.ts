import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { StorageAdapter, StorageFilter } from "./storage-adapter.interface";
import { matchesWhere } from "./memory.storage";

type JsonDatabase = Record<string, Record<string, unknown>>;

export class JsonStorage implements StorageAdapter {
  readonly name = "json";
  private data: JsonDatabase = {};

  constructor(private readonly path: string) {}

  async connect(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    try {
      this.data = JSON.parse(await readFile(this.path, "utf8")) as JsonDatabase;
    } catch {
      this.data = {};
      await this.flush();
    }
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    return (this.data[collection]?.[id] as T | undefined) ?? null;
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    this.data[collection] ??= {};
    this.data[collection][id] = value;
    await this.flush();
  }

  async delete(collection: string, id: string): Promise<void> {
    if (this.data[collection]) {
      delete this.data[collection][id];
      await this.flush();
    }
  }

  async query<T>(collection: string, filter: StorageFilter = {}): Promise<T[]> {
    const values = Object.values(this.data[collection] ?? {}) as T[];
    const filtered = values.filter((value) => matchesWhere(value, filter.where));
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  async close(): Promise<void> {
    await this.flush();
  }

  private async flush(): Promise<void> {
    await writeFile(this.path, JSON.stringify(this.data, null, 2), "utf8");
  }
}
