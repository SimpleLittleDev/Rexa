import { createId } from "../common/result";
import { embedText, VectorStorage } from "../storage/vector.storage";

export class VectorMemory {
  constructor(private readonly storage: VectorStorage) {}

  async init(): Promise<void> {
    await this.storage.connect();
  }

  async remember(text: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await this.storage.upsert({
      id: createId("vec"),
      text,
      vector: embedText(text),
      metadata,
    });
  }

  search(query: string, limit?: number): Promise<Array<{ text: string; metadata: Record<string, unknown> }>> {
    return this.storage.search(query, limit).then((records) =>
      records.map((record) => ({
        text: record.text,
        metadata: record.metadata,
      })),
    );
  }
}
