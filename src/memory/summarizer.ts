import type { MemoryRecord } from "./memory-manager";

export class MemorySummarizer {
  summarize(records: MemoryRecord[]): string {
    if (records.length === 0) return "No relevant memory.";
    return records.map((record) => `- ${record.type}: ${record.text}`).join("\n");
  }
}
