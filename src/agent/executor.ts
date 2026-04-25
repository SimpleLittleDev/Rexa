import { BrowserTool } from "../tools/browser/browser.tool";
import { FileTool } from "../tools/file/file.tool";
import { TerminalTool } from "../tools/terminal/terminal.tool";

export interface ExecutorTools {
  terminal: TerminalTool;
  file: FileTool;
  browser: BrowserTool;
}

export class Executor {
  constructor(readonly tools: ExecutorTools) {}
}
