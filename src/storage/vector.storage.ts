import { JsonStorage } from "./json.storage";

export interface VectorRecord {
  id: string;
  text: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export class VectorStorage {
  private readonly storage: JsonStorage;

  constructor(path: string) {
    this.storage = new JsonStorage(path);
  }

  async connect(): Promise<void> {
    await this.storage.connect();
  }

  async upsert(record: VectorRecord): Promise<void> {
    await this.storage.set("vectors", record.id, record);
  }

  async search(query: string, limit = 8): Promise<VectorRecord[]> {
    const queryVector = embedText(query);
    const records = await this.storage.query<VectorRecord>("vectors");
    return records
      .map((record) => ({ record, score: cosine(queryVector, record.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.record);
  }
}

export function embedText(text: string): number[] {
  const vector = new Array(64).fill(0);
  for (const token of text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
    let hash = 0;
    for (const char of token) hash = (hash * 31 + char.charCodeAt(0)) % vector.length;
    vector[hash] += 1;
  }
  return vector;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const av = a[index] ?? 0;
    const bv = b[index] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
