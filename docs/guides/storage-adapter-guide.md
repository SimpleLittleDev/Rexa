# Storage Adapter Guide

Storage interface:

```ts
interface StorageAdapter {
  name: string;
  connect(): Promise<void>;
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, value: T): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  query<T>(collection: string, filter: StorageFilter): Promise<T[]>;
  close(): Promise<void>;
}
```

Modes:
- JSON: default runnable local mode.
- SQLite: local assistant mode, requires `better-sqlite3`.
- PostgreSQL: server/VPS mode, requires `pg` and `DATABASE_URL`.
- Memory: testing mode.
- Vector: local hashed vector MVP, replaceable later.
