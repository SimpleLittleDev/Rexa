import { createRequire } from "node:module";
import type { StorageAdapter, StorageFilter } from "./storage-adapter.interface";
import { matchesWhere } from "./memory.storage";

const requireOptional = createRequire(__filename);

export class PostgresStorage implements StorageAdapter {
  readonly name = "postgres";
  private client: any | null = null;

  constructor(private readonly connectionString: string) {}

  async connect(): Promise<void> {
    let Client: any;
    try {
      Client = requireOptional("pg").Client;
    } catch {
      throw new Error("Postgres adapter requires optional package 'pg'. Install it before using postgres storage.");
    }
    this.client = new Client({ connectionString: this.connectionString });
    await this.client.connect();
    await this.client.query(
      "create table if not exists rexa_kv (collection text not null, id text not null, value jsonb not null, primary key(collection, id))",
    );
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const result = await this.ensureClient().query("select value from rexa_kv where collection = $1 and id = $2", [collection, id]);
    return (result.rows[0]?.value as T | undefined) ?? null;
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    await this.ensureClient().query(
      "insert into rexa_kv(collection, id, value) values($1, $2, $3) on conflict(collection, id) do update set value = excluded.value",
      [collection, id, value],
    );
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.ensureClient().query("delete from rexa_kv where collection = $1 and id = $2", [collection, id]);
  }

  async query<T>(collection: string, filter: StorageFilter = {}): Promise<T[]> {
    const result = await this.ensureClient().query("select value from rexa_kv where collection = $1", [collection]);
    const values = result.rows.map((row: { value: T }) => row.value);
    const filtered = values.filter((value: T) => matchesWhere(value, filter.where));
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  async close(): Promise<void> {
    await this.client?.end();
    this.client = null;
  }

  private ensureClient(): any {
    if (!this.client) throw new Error("Postgres storage is not connected");
    return this.client;
  }
}
