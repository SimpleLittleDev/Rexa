import type { EmbeddingsConfig } from "../app/config";

/**
 * Pluggable embeddings client used by `VectorStorage` / `VectorMemory`.
 *
 * Default config picks `openai` + `text-embedding-3-small` (1536 dims). When
 * the API key is missing or the provider is set to `mock`, the client falls
 * back to a deterministic hashing embedding so memory still works offline.
 */
export interface EmbeddingsClient {
  /** Vector dimensionality. */
  dimensions: number;
  /** Convert one or more strings to embeddings. */
  embed(texts: string[]): Promise<number[][]>;
}

export function createEmbeddingsClient(config: EmbeddingsConfig): EmbeddingsClient {
  if (!config.enabled) return new MockEmbeddings(config.dimensions);
  switch (config.provider) {
    case "openai":
      return new OpenAIEmbeddings(config);
    case "voyage":
      return new VoyageEmbeddings(config);
    case "ollama":
      return new OllamaEmbeddings(config);
    case "mock":
    default:
      return new MockEmbeddings(config.dimensions);
  }
}

export class MockEmbeddings implements EmbeddingsClient {
  constructor(public readonly dimensions: number = 64) {}
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => hashEmbedding(text, this.dimensions));
  }
}

class OpenAIEmbeddings implements EmbeddingsClient {
  readonly dimensions: number;
  private readonly model: string;
  private readonly apiKeyEnv: string;
  private readonly fallback: MockEmbeddings;

  constructor(config: EmbeddingsConfig) {
    this.dimensions = config.dimensions;
    this.model = config.model;
    this.apiKeyEnv = config.apiKeyEnv;
    this.fallback = new MockEmbeddings(config.dimensions);
  }

  async embed(texts: string[]): Promise<number[][]> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) return this.fallback.embed(texts);
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI embeddings failed: ${response.status} ${await response.text()}`);
    }
    const json = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return json.data.map((row) => row.embedding);
  }
}

class VoyageEmbeddings implements EmbeddingsClient {
  readonly dimensions: number;
  private readonly model: string;
  private readonly apiKeyEnv: string;
  private readonly fallback: MockEmbeddings;

  constructor(config: EmbeddingsConfig) {
    this.dimensions = config.dimensions;
    this.model = config.model;
    this.apiKeyEnv = config.apiKeyEnv || "VOYAGE_API_KEY";
    this.fallback = new MockEmbeddings(config.dimensions);
  }

  async embed(texts: string[]): Promise<number[][]> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) return this.fallback.embed(texts);
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!response.ok) {
      throw new Error(`Voyage embeddings failed: ${response.status} ${await response.text()}`);
    }
    const json = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return json.data.map((row) => row.embedding);
  }
}

class OllamaEmbeddings implements EmbeddingsClient {
  readonly dimensions: number;
  private readonly model: string;
  private readonly host: string;
  private readonly fallback: MockEmbeddings;

  constructor(config: EmbeddingsConfig) {
    this.dimensions = config.dimensions;
    this.model = config.model;
    this.host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
    this.fallback = new MockEmbeddings(config.dimensions);
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const out: number[][] = [];
      for (const text of texts) {
        const response = await fetch(`${this.host}/api/embeddings`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: this.model, prompt: text }),
        });
        if (!response.ok) throw new Error(`Ollama embeddings failed: ${response.status}`);
        const json = (await response.json()) as { embedding: number[] };
        out.push(json.embedding);
      }
      return out;
    } catch {
      return this.fallback.embed(texts);
    }
  }
}

/**
 * Deterministic offline embedding — token-hash bag-of-words projected onto a
 * fixed-size vector. Good enough for keyword-similarity fallback when no API
 * key is configured.
 */
export function hashEmbedding(text: string, dimensions: number): number[] {
  const vector = new Array(dimensions).fill(0);
  for (const token of text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
    let hash = 0;
    for (const ch of token) hash = (hash * 31 + ch.charCodeAt(0)) % dimensions;
    vector[hash] += 1;
  }
  // L2-normalise so cosine == dot product.
  let mag = 0;
  for (const v of vector) mag += v * v;
  mag = Math.sqrt(mag) || 1;
  for (let i = 0; i < vector.length; i += 1) vector[i] /= mag;
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
