import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { logger } from "../logs/logger";
import type { JsonRpcMessage } from "./mcp-protocol";

/**
 * Transport abstraction for MCP. The protocol itself is JSON-RPC over
 * either stdio (long-running child process) or a streaming HTTP
 * transport (Server-Sent Events for server→client + POST for
 * client→server). Stdio is the dominant transport in the MCP ecosystem
 * today, so we ship that first; SSE comes free if/when we need it
 * because the upper-layer Client only consumes `send` + `onMessage`.
 */
export interface McpTransport {
  start(): Promise<void>;
  send(message: JsonRpcMessage): Promise<void>;
  onMessage(handler: (message: JsonRpcMessage) => void): void;
  onClose(handler: (code: number | null) => void): void;
  close(): Promise<void>;
}

export interface StdioTransportOptions {
  command: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

/**
 * MCP servers communicate over stdio with newline-delimited JSON. Each
 * message is a single JSON-RPC envelope on its own line.
 */
export class StdioTransport implements McpTransport {
  private child: ChildProcess | null = null;
  private buffer = "";
  private readonly emitter = new EventEmitter();

  constructor(private readonly options: StdioTransportOptions) {}

  async start(): Promise<void> {
    if (this.child) return;
    const child = spawn(this.options.command, this.options.args ?? [], {
      env: { ...process.env, ...this.options.env },
      cwd: this.options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.on("error", (error) => {
      logger.warn("[mcp] stdio transport error", { error: error.message });
      this.emitter.emit("close", null);
    });
    child.on("exit", (code) => {
      logger.info("[mcp] stdio transport closed", { code });
      this.emitter.emit("close", code);
    });
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => this.consume(chunk));
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      const trimmed = chunk.trim();
      if (trimmed) logger.debug("[mcp:stderr]", { line: trimmed });
    });
    this.child = child;
  }

  async send(message: JsonRpcMessage): Promise<void> {
    if (!this.child?.stdin) throw new Error("MCP stdio transport not started");
    const line = JSON.stringify(message) + "\n";
    if (!this.child.stdin.write(line)) {
      await new Promise<void>((resolve) => this.child?.stdin?.once("drain", resolve));
    }
  }

  onMessage(handler: (message: JsonRpcMessage) => void): void {
    this.emitter.on("message", handler);
  }

  onClose(handler: (code: number | null) => void): void {
    this.emitter.on("close", handler);
  }

  async close(): Promise<void> {
    if (!this.child) return;
    this.child.kill("SIGTERM");
    this.child = null;
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    let idx = this.buffer.indexOf("\n");
    while (idx >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (line) {
        try {
          const message = JSON.parse(line) as JsonRpcMessage;
          this.emitter.emit("message", message);
        } catch (error) {
          logger.warn("[mcp] failed to parse line", {
            line: line.slice(0, 200),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      idx = this.buffer.indexOf("\n");
    }
  }
}
