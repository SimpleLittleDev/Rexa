import { logger } from "../logs/logger";
import type { LLMToolDefinition } from "../llm/llm-provider.interface";
import type { ToolHandler } from "../tools/tool-dispatcher";
import { McpClient, type McpClientOptions } from "./mcp-client";
import type { CallToolResult, ToolContent } from "./mcp-protocol";
import { StdioTransport, type McpTransport, type StdioTransportOptions } from "./mcp-transport";

export interface McpServerConfig {
  /** Local label used in tool prefixes / logs / `rexa mcp list`. */
  name: string;
  /** Stdio transport — shipped today. SSE/HTTP coming next. */
  transport?: "stdio";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  /** When false, `MCPRegistry.connectAll` skips this server. */
  enabled?: boolean;
  /** Optional per-server tool name allowlist. */
  toolAllowlist?: string[];
  /** Optional MCP-side request timeout. */
  requestTimeoutMs?: number;
}

export interface McpServerHandle {
  config: McpServerConfig;
  client: McpClient;
  toolDefinitions: LLMToolDefinition[];
  toolHandlers: ToolHandler[];
  error?: string;
}

export interface MCPRegistryOptions {
  clientOptions?: McpClientOptions;
}

/**
 * Manages a fleet of MCP server connections. The orchestrator wires the
 * registry into the central `ToolDispatcher` so that every connected
 * MCP server's tools become first-class agent tools — alongside the
 * native browser/file/terminal tools — without any per-tool adapter.
 */
export class MCPRegistry {
  private readonly handles = new Map<string, McpServerHandle>();

  constructor(private readonly options: MCPRegistryOptions = {}) {}

  list(): McpServerHandle[] {
    return Array.from(this.handles.values());
  }

  get(name: string): McpServerHandle | undefined {
    return this.handles.get(name);
  }

  async connectAll(configs: McpServerConfig[]): Promise<McpServerHandle[]> {
    const enabled = configs.filter((c) => c.enabled !== false);
    const handles = await Promise.all(enabled.map((config) => this.connect(config).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("[mcp] connect failed", { name: config.name, error: message });
      return {
        config,
        client: null as unknown as McpClient,
        toolDefinitions: [],
        toolHandlers: [],
        error: message,
      } as McpServerHandle;
    })));
    for (const handle of handles) this.handles.set(handle.config.name, handle);
    return handles;
  }

  async connect(config: McpServerConfig): Promise<McpServerHandle> {
    if (this.handles.has(config.name)) {
      throw new Error(`MCP server '${config.name}' is already connected`);
    }
    if (!config.command && (config.transport ?? "stdio") === "stdio") {
      throw new Error(`MCP server '${config.name}': stdio transport requires 'command'`);
    }
    const transport = this.createTransport(config);
    const client = new McpClient(transport, {
      ...this.options.clientOptions,
      requestTimeoutMs: config.requestTimeoutMs ?? this.options.clientOptions?.requestTimeoutMs,
    });
    await client.connect();
    const tools = await client.listTools();
    const allowlist = config.toolAllowlist ? new Set(config.toolAllowlist) : null;
    const filtered = allowlist ? tools.filter((t) => allowlist.has(t.name)) : tools;
    const toolDefinitions: LLMToolDefinition[] = filtered.map((t) => ({
      name: prefixed(config.name, t.name),
      description: t.description ?? `${config.name} MCP tool: ${t.name}`,
      parameters: t.inputSchema as LLMToolDefinition["parameters"],
    }));
    const toolHandlers: ToolHandler[] = filtered.map((t) => ({
      definition: toolDefinitions.find((d) => d.name === prefixed(config.name, t.name))!,
      execute: async (args) => {
        const result = await client.callTool(t.name, args);
        return summarizeToolResult(result);
      },
    }));
    const handle: McpServerHandle = {
      config,
      client,
      toolDefinitions,
      toolHandlers,
    };
    this.handles.set(config.name, handle);
    logger.info("[mcp] connected", {
      name: config.name,
      tools: toolDefinitions.length,
      server: client.info?.name,
    });
    return handle;
  }

  async closeAll(): Promise<void> {
    await Promise.all(
      this.list().map(async (handle) => {
        if (!handle.client) return;
        try {
          await handle.client.close();
        } catch (error) {
          logger.warn("[mcp] close failed", {
            name: handle.config.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
    this.handles.clear();
  }

  private createTransport(config: McpServerConfig): McpTransport {
    const options: StdioTransportOptions = {
      command: config.command!,
      args: config.args,
      env: config.env,
      cwd: config.cwd,
    };
    return new StdioTransport(options);
  }
}

function prefixed(server: string, tool: string): string {
  // Tool name format: mcp__<server>__<tool>. The double underscore makes
  // it easy for the dispatcher / observers to recognise MCP-routed
  // calls and route metadata back to the right server.
  return `mcp__${sanitize(server)}__${sanitize(tool)}`;
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "_");
}

/**
 * Flatten an MCP tool result into something the dispatcher/observer can
 * stringify cleanly. Text content is concatenated; image/resource
 * content is summarised with metadata so the model can reason about it.
 */
function summarizeToolResult(result: CallToolResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent;
  if (!result.content || result.content.length === 0) {
    return result.isError ? { error: "MCP tool returned isError=true with no content" } : {};
  }
  const text = result.content
    .filter((c): c is Extract<ToolContent, { type: "text" }> => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  const nonText = result.content.filter((c) => c.type !== "text");
  if (nonText.length === 0) {
    if (result.isError) return { error: text };
    return text;
  }
  return {
    text,
    attachments: nonText.map((c) => {
      if (c.type === "image") return { kind: "image", mimeType: c.mimeType, bytes: c.data.length };
      if (c.type === "resource") return { kind: "resource", uri: c.resource.uri, mimeType: c.resource.mimeType };
      return { kind: "unknown" };
    }),
    isError: result.isError ?? false,
  };
}
