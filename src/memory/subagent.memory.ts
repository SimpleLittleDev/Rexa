import { MemoryManager, type RememberInput } from "./memory-manager";

export class SubAgentMemory {
  constructor(
    private readonly agentId: string,
    private readonly memory: MemoryManager,
  ) {}

  remember(input: Omit<RememberInput, "scope">): Promise<unknown> {
    return this.memory.remember({ ...input, scope: `subagent:${this.agentId}` });
  }
}
