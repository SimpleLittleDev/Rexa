import { createRequire } from "node:module";
import type { StorageAdapter, StorageFilter } from "./storage-adapter.interface";
import { matchesWhere } from "./memory.storage";

const requireOptional = createRequire(__filename);

export class SQLiteStorage implements StorageAdapter {
  readonly name = "sqlite";
  private db: any | null = null;

  constructor(private readonly path: string) {}

  async connect(): Promise<void> {
    let Database: any;
    try {
      Database = requireOptional("better-sqlite3");
    } catch {
      throw new Error("SQLite adapter requires optional package 'better-sqlite3'. Install it before using sqlite storage.");
    }
    this.db = new Database(this.path);
    this.db.exec("create table if not exists kv (collection text not null, id text not null, value text not null, primary key(collection, id))");
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const row = this.ensureDb().prepare("select value from kv where collection = ? and id = ?").get(collection, id);
    return row ? (JSON.parse(row.value) as T) : null;
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    this.ensureDb()
      .prepare("insert into kv(collection, id, value) values(?, ?, ?) on conflict(collection, id) do update set value = excluded.value")
      .run(collection, id, JSON.stringify(value));
  }

  async delete(collection: string, id: string): Promise<void> {
    this.ensureDb().prepare("delete from kv where collection = ? and id = ?").run(collection, id);
  }

  async query<T>(collection: string, filter: StorageFilter = {}): Promise<T[]> {
    const rows = this.ensureDb().prepare("select value from kv where collection = ?").all(collection);
    const values = rows.map((row: { value: string }) => JSON.parse(row.value) as T);
    const filtered = values.filter((value: T) => matchesWhere(value, filter.where));
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  private ensureDb(): any {
    if (!this.db) throw new Error("SQLite storage is not connected");
    return this.db;
  }
}
