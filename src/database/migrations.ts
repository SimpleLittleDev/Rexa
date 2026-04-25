export const migrations = [
  {
    id: "001_kv_storage",
    sql: "create table if not exists rexa_kv (collection text not null, id text not null, value jsonb not null, primary key(collection, id));",
  },
] as const;
