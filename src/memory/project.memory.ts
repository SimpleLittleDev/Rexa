import { MemoryManager, type RememberInput } from "./memory-manager";

export class ProjectMemory {
  constructor(
    private readonly projectId: string,
    private readonly memory: MemoryManager,
  ) {}

  remember(input: Omit<RememberInput, "scope">): Promise<unknown> {
    return this.memory.remember({
      ...input,
      scope: `project:${this.projectId}`,
    });
  }

  retrieve(query: string): Promise<unknown> {
    return this.memory.retrieve(query, { scope: `project:${this.projectId}` });
  }
}
