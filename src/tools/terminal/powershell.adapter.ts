import { TerminalTool, type TerminalRunOptions } from "./terminal.tool";

export class PowerShellAdapter {
  constructor(private readonly terminal = new TerminalTool()) {}

  run(command: string, options: TerminalRunOptions = {}) {
    return this.terminal.run(`powershell.exe -NoProfile -Command ${JSON.stringify(command)}`, options);
  }
}
