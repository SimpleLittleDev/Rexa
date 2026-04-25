import { JsonStorage } from "./json.storage";
import {
  cosineSimilarity,
  createEmbeddingsClient,
  hashEmbedding,
  type EmbeddingsClient,
} from "../llm/embeddings";
import type { EmbeddingsConfig } from "../app/config";

export interface VectorRecord {
  id: string;
  text: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface VectorStorageOptions {
  embeddings?: EmbeddingsClient | EmbeddingsConfig;
}

/**
 * JSON-backed vector store with optional real embeddings.
 *
 * Records carry their embedding alongside the source text so queries can be
 * scored via cosine similarity without re-embedding the corpus.
 */
export class VectorStorage {
  private readonly storage: JsonStorage;
  private readonly embedder: EmbeddingsClient;

  constructor(path: string, options: VectorStorageOptions = {}) {
    this.storage = new JsonStorage(path);
    if (options.embeddings && "embed" in options.embeddings) {
      this.embedder = options.embeddings;
    } else if (options.embeddings) {
      this.embedder = createEmbeddingsClient(options.embeddings);
    } else {
      this.embedder = {
        dimensions: 64,
        embed: async (texts) => texts.map((text) => hashEmbedding(text, 64)),
      };
    }
  }

  async connect(): Promise<void> {
    await this.storage.connect();
  }

  async upsert(record: Omit<VectorRecord, "vector"> & { vector?: number[] }): Promise<void> {
    const vector = record.vector ?? (await this.embedder.embed([record.text]))[0];
    await this.storage.set("vectors", record.id, { ...record, vector });
  }

  async upsertMany(records: Array<Omit<VectorRecord, "vector"> & { vector?: number[] }>): Promise<void> {
    const missing = records.map((record, index) => ({ index, text: record.text })).filter(({ index }) => !records[index].vector);
    if (missing.length > 0) {
      const vectors = await this.embedder.embed(missing.map((m) => m.text));
      missing.forEach(({ index }, i) => {
        records[index] = { ...records[index], vector: vectors[i] };
      });
    }
    await Promise.all(records.map((record) => this.storage.set("vectors", record.id, record as VectorRecord)));
  }

  async search(query: string, limit = 8): Promise<VectorRecord[]> {
    const [queryVector] = await this.embedder.embed([query]);
    const records = await this.storage.query<VectorRecord>("vectors");
    return records
      .map((record) => ({ record, score: cosineSimilarity(queryVector, record.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.record);
  }
}

/**
 * Legacy hash-based embed kept for backwards compatibility with code that
 * imported the old function. Prefer `createEmbeddingsClient(...)` for new code.
 */
export function embedText(text: string): number[] {
  return hashEmbedding(text, 64);
}
