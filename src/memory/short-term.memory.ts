import type { MemoryRecord } from "./memory-manager";

export class ShortTermMemory {
  private readonly records: MemoryRecord[] = [];

  add(record: MemoryRecord): void {
    this.records.push(record);
    if (this.records.length > 50) this.records.shift();
  }

  list(): MemoryRecord[] {
    return [...this.records];
  }
}
