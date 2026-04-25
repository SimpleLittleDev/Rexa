import { logger } from "../logs/logger";
import {
  JSONRPC_VERSION,
  MCP_PROTOCOL_VERSION,
  type CallToolResult,
  type GetPromptResult,
  type InitializeResult,
  type JsonRpcErrorResponse,
  type JsonRpcMessage,
  type JsonRpcSuccessResponse,
  type ListPromptsResult,
  type ListResourcesResult,
  type ListToolsResult,
  type McpPrompt,
  type McpResource,
  type McpToolSchema,
  type ReadResourceResult,
  type ServerCapabilities,
  type ServerInfo,
} from "./mcp-protocol";
import type { McpTransport } from "./mcp-transport";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export interface McpClientOptions {
  /** Display name advertised to the server. */
  clientName?: string;
  clientVersion?: string;
  /** Hard timeout per request in ms. Default 30000. */
  requestTimeoutMs?: number;
}

/**
 * MCP client speaking JSON-RPC 2.0 over an arbitrary `McpTransport`.
 *
 * Lifecycle:
 *   1. `await client.connect()` — performs the `initialize` handshake.
 *   2. `await client.listTools()` / `callTool()` / `listResources()` …
 *   3. `await client.close()` to terminate.
 *
 * The client owns request-id allocation and pending-promise tracking so
 * callers see a clean async/await API instead of raw envelopes.
 */
export class McpClient {
  private nextId = 1;
  private readonly pending = new Map<string | number, PendingRequest>();
  private serverInfo: ServerInfo | null = null;
  private capabilities: ServerCapabilities = {};
  private connected = false;
  private closed = false;
  private readonly clientName: string;
  private readonly clientVersion: string;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly transport: McpTransport,
    options: McpClientOptions = {},
  ) {
    this.clientName = options.clientName ?? "rexa";
    this.clientVersion = options.clientVersion ?? "0.2.0";
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.transport.onMessage((message) => this.handleIncoming(message));
    this.transport.onClose((code) => this.handleClose(code));
  }

  get info(): ServerInfo | null {
    return this.serverInfo;
  }

  get serverCapabilities(): ServerCapabilities {
    return this.capabilities;
  }

  async connect(): Promise<InitializeResult> {
    if (this.connected) throw new Error("MCP client already connected");
    await this.transport.start();
    const result = await this.request<InitializeResult>("initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      clientInfo: { name: this.clientName, version: this.clientVersion },
      capabilities: {
        // Rexa is a tool consumer; we don't expose tools/resources/prompts back to the server.
      },
    });
    this.serverInfo = result.serverInfo;
    this.capabilities = result.capabilities ?? {};
    // RFC: send `notifications/initialized` after the handshake.
    await this.notify("notifications/initialized");
    this.connected = true;
    return result;
  }

  async listTools(): Promise<McpToolSchema[]> {
    const result = await this.request<ListToolsResult>("tools/list");
    return result.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> {
    return this.request<CallToolResult>("tools/call", { name, arguments: args });
  }

  async listResources(): Promise<McpResource[]> {
    if (!this.capabilities.resources) return [];
    const result = await this.request<ListResourcesResult>("resources/list");
    return result.resources ?? [];
  }

  async readResource(uri: string): Promise<ReadResourceResult> {
    return this.request<ReadResourceResult>("resources/read", { uri });
  }

  async listPrompts(): Promise<McpPrompt[]> {
    if (!this.capabilities.prompts) return [];
    const result = await this.request<ListPromptsResult>("prompts/list");
    return result.prompts ?? [];
  }

  async getPrompt(name: string, args: Record<string, string> = {}): Promise<GetPromptResult> {
    return this.request<GetPromptResult>("prompts/get", { name, arguments: args });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("MCP client closed"));
    }
    this.pending.clear();
    await this.transport.close();
  }

  /** Generic escape hatch — useful for sampling/logging/etc. methods. */
  async request<T>(method: string, params?: unknown): Promise<T> {
    if (this.closed) throw new Error("MCP client is closed");
    const id = this.nextId++;
    const message: JsonRpcMessage = { jsonrpc: JSONRPC_VERSION, id, method, params };
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request '${method}' timed out after ${this.requestTimeoutMs}ms`));
      }, this.requestTimeoutMs);
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      void this.transport.send(message).catch((error) => {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  private async notify(method: string, params?: unknown): Promise<void> {
    await this.transport.send({ jsonrpc: JSONRPC_VERSION, method, params });
  }

  private handleIncoming(message: JsonRpcMessage): void {
    if ("id" in message && (message as { id: unknown }).id !== undefined && !("method" in message)) {
      const id = (message as JsonRpcSuccessResponse | JsonRpcErrorResponse).id;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      clearTimeout(pending.timer);
      if ("error" in message) {
        const err = message.error;
        pending.reject(new Error(`MCP error ${err.code}: ${err.message}`));
      } else {
        pending.resolve((message as JsonRpcSuccessResponse).result);
      }
      return;
    }
    // Server-initiated notification or request — log for now; full
    // bidirectional support (sampling, logging, ping) lands later.
    if ("method" in message) {
      logger.debug("[mcp] server notification", { method: message.method });
    }
  }

  private handleClose(code: number | null): void {
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(`MCP transport closed (code=${code ?? "n/a"})`));
    }
    this.pending.clear();
  }
}
