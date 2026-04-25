export interface StorageFilter {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface StorageAdapter {
  name: string;
  connect(): Promise<void>;
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, value: T): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  query<T>(collection: string, filter?: StorageFilter): Promise<T[]>;
  close(): Promise<void>;
}
