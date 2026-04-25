import { Orchestrator, type RexaRunOptions, type RexaRunResult } from "./orchestrator";

export class MainAgent {
  constructor(private readonly orchestrator: Orchestrator) {}

  run(message: string, options: RexaRunOptions = {}): Promise<RexaRunResult> {
    return this.orchestrator.handle(message, options);
  }
}
