import { TerminalTool, type TerminalRunOptions } from "./terminal.tool";

export class ShellAdapter {
  constructor(private readonly terminal = new TerminalTool()) {}

  run(command: string, options: TerminalRunOptions = {}) {
    return this.terminal.run(command, options);
  }
}
