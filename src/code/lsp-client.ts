import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { logger } from "../logs/logger";

/**
 * Minimal Language Server Protocol client. Speaks JSON-RPC over stdio
 * with the LSP framing: `Content-Length: N\r\n\r\n{json}`.
 *
 * We deliberately keep this thin: enough to spawn a server, run
 * `initialize`, send `textDocument/didOpen` + `textDocument/definition`
 * + `textDocument/references` + `textDocument/documentSymbol`, and
 * shut down cleanly. The agent uses these for ground-truth code
 * navigation when an LSP server is configured; falls back to ripgrep
 * heuristics otherwise.
 */

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export interface LSPInitializeParams {
  rootUri: string;
  capabilities?: Record<string, unknown>;
}

export interface Position {
  line: number; // 0-based
  character: number; // 0-based
}

export interface LocationLike {
  uri: string;
  range: { start: Position; end: Position };
}

export interface DocumentSymbol {
  name: string;
  kind: number;
  range: { start: Position; end: Position };
  selectionRange: { start: Position; end: Position };
  children?: DocumentSymbol[];
}

export class LSPClient {
  private child: ChildProcess | null = null;
  private buffer = Buffer.alloc(0);
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly emitter = new EventEmitter();
  private initialized = false;

  constructor(
    private readonly command: string,
    private readonly args: string[] = [],
    private readonly options: { cwd?: string; env?: NodeJS.ProcessEnv; requestTimeoutMs?: number } = {},
  ) {}

  async start(rootUri: string): Promise<void> {
    if (this.child) return;
    const child = spawn(this.command, this.args, {
      cwd: this.options.cwd,
      env: { ...process.env, ...this.options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const line = chunk.toString("utf8").trim();
      if (line) logger.debug("[lsp:stderr]", { line: line.slice(0, 200) });
    });
    child.stdout?.on("data", (chunk: Buffer) => this.consume(chunk));
    child.on("exit", (code) => {
      logger.info("[lsp] server exited", { command: this.command, code });
      this.shutdownPendings(new Error(`LSP server exited (code=${code})`));
      this.child = null;
    });
    this.child = child;

    await this.request<unknown>("initialize", {
      processId: process.pid,
      rootUri,
      capabilities: {
        textDocument: {
          definition: { dynamicRegistration: false },
          references: { dynamicRegistration: false },
          documentSymbol: { dynamicRegistration: false, hierarchicalDocumentSymbolSupport: true },
          synchronization: { dynamicRegistration: false, didOpen: true, didClose: true },
        },
      },
    });
    await this.notify("initialized", {});
    this.initialized = true;
  }

  async didOpen(uri: string, languageId: string, text: string, version = 1): Promise<void> {
    await this.notify("textDocument/didOpen", {
      textDocument: { uri, languageId, version, text },
    });
  }

  async didClose(uri: string): Promise<void> {
    await this.notify("textDocument/didClose", { textDocument: { uri } });
  }

  async definition(uri: string, position: Position): Promise<LocationLike[]> {
    const result = (await this.request("textDocument/definition", {
      textDocument: { uri },
      position,
    })) as LocationLike | LocationLike[] | null;
    return normaliseLocations(result);
  }

  async references(uri: string, position: Position, includeDeclaration = true): Promise<LocationLike[]> {
    const result = (await this.request("textDocument/references", {
      textDocument: { uri },
      position,
      context: { includeDeclaration },
    })) as LocationLike[] | null;
    return normaliseLocations(result);
  }

  async documentSymbol(uri: string): Promise<DocumentSymbol[]> {
    const result = (await this.request("textDocument/documentSymbol", {
      textDocument: { uri },
    })) as DocumentSymbol[] | null;
    return result ?? [];
  }

  async shutdown(): Promise<void> {
    if (!this.child) return;
    try {
      await this.request("shutdown", null);
      await this.notify("exit");
    } catch {
      // ignore
    }
    this.child?.kill("SIGTERM");
    this.child = null;
    this.initialized = false;
  }

  private async request<T>(method: string, params: unknown): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`LSP request '${method}' timed out`));
      }, this.options.requestTimeoutMs ?? 30_000);
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      this.send({ jsonrpc: "2.0", id, method, params });
    });
  }

  private async notify(method: string, params?: unknown): Promise<void> {
    this.send({ jsonrpc: "2.0", method, params });
  }

  private send(message: unknown): void {
    if (!this.child?.stdin) throw new Error("LSP server not started");
    const json = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n`;
    this.child.stdin.write(header + json);
  }

  private consume(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = this.buffer.subarray(0, headerEnd).toString("utf8");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        this.buffer = this.buffer.subarray(headerEnd + 4);
        continue;
      }
      const length = parseInt(match[1], 10);
      const total = headerEnd + 4 + length;
      if (this.buffer.length < total) return;
      const body = this.buffer.subarray(headerEnd + 4, total).toString("utf8");
      this.buffer = this.buffer.subarray(total);
      try {
        const message = JSON.parse(body) as { id?: number; result?: unknown; error?: { code: number; message: string }; method?: string };
        if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
          const pending = this.pending.get(message.id);
          if (!pending) continue;
          this.pending.delete(message.id);
          clearTimeout(pending.timer);
          if (message.error) {
            pending.reject(new Error(`LSP error ${message.error.code}: ${message.error.message}`));
          } else {
            pending.resolve(message.result);
          }
        } else if (message.method) {
          this.emitter.emit("notification", message);
        }
      } catch (error) {
        logger.warn("[lsp] failed to parse message", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private shutdownPendings(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function normaliseLocations(value: LocationLike | LocationLike[] | null): LocationLike[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
