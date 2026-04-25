import { createId } from "../common/result";
import { VectorStorage } from "../storage/vector.storage";

export class VectorMemory {
  constructor(private readonly storage: VectorStorage) {}

  async init(): Promise<void> {
    await this.storage.connect();
  }

  async remember(text: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await this.storage.upsert({
      id: createId("vec"),
      text,
      metadata,
    });
  }

  async rememberMany(items: Array<{ text: string; metadata?: Record<string, unknown> }>): Promise<void> {
    await this.storage.upsertMany(
      items.map((item) => ({
        id: createId("vec"),
        text: item.text,
        metadata: item.metadata ?? {},
      })),
    );
  }

  async search(query: string, limit?: number): Promise<Array<{ text: string; metadata: Record<string, unknown> }>> {
    const records = await this.storage.search(query, limit);
    return records.map((record) => ({ text: record.text, metadata: record.metadata }));
  }
}
