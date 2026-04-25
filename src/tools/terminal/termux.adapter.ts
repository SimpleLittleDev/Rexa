import { TerminalTool, type TerminalRunOptions } from "./terminal.tool";

export class TermuxTerminalAdapter {
  constructor(private readonly terminal = new TerminalTool()) {}

  run(command: string, options: TerminalRunOptions = {}) {
    return this.terminal.run(command, {
      ...options,
      env: {
        ...process.env,
        PREFIX: process.env.PREFIX,
        HOME: process.env.HOME,
        ...options.env,
      },
    });
  }
}
