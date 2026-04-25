/**
 * MCP (Model Context Protocol) wire types.
 *
 * Spec: https://modelcontextprotocol.io
 *
 * We implement the JSON-RPC 2.0 envelope plus the subset of methods Rexa
 * actively consumes today: capability negotiation (`initialize`), tool
 * listing/invocation (`tools/list`, `tools/call`), resource browsing
 * (`resources/list`, `resources/read`), and prompt templates
 * (`prompts/list`, `prompts/get`). Other methods can be sent through via
 * the generic `request` API on the client.
 */

export const JSONRPC_VERSION = "2.0";
export const MCP_PROTOCOL_VERSION = "2024-11-05";

export interface JsonRpcRequest {
  jsonrpc: typeof JSONRPC_VERSION;
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: typeof JSONRPC_VERSION;
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccessResponse<T = unknown> {
  jsonrpc: typeof JSONRPC_VERSION;
  id: string | number;
  result: T;
}

export interface JsonRpcErrorResponse {
  jsonrpc: typeof JSONRPC_VERSION;
  id: string | number;
  error: { code: number; message: string; data?: unknown };
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccessResponse
  | JsonRpcErrorResponse;

export interface ServerInfo {
  name: string;
  version?: string;
}

export interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, unknown>;
}

export interface InitializeResult {
  protocolVersion: string;
  serverInfo: ServerInfo;
  capabilities: ServerCapabilities;
  instructions?: string;
}

export interface McpToolSchema {
  name: string;
  description?: string;
  inputSchema: { type: "object"; properties?: Record<string, unknown>; required?: string[] };
}

export interface ListToolsResult {
  tools: McpToolSchema[];
  nextCursor?: string;
}

export interface ToolContentText {
  type: "text";
  text: string;
}

export interface ToolContentImage {
  type: "image";
  data: string; // base64
  mimeType: string;
}

export interface ToolContentResource {
  type: "resource";
  resource: { uri: string; mimeType?: string; text?: string; blob?: string };
}

export type ToolContent = ToolContentText | ToolContentImage | ToolContentResource;

export interface CallToolResult {
  content: ToolContent[];
  isError?: boolean;
  structuredContent?: unknown;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface ListResourcesResult {
  resources: McpResource[];
  nextCursor?: string;
}

export interface ReadResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

export interface ListPromptsResult {
  prompts: McpPrompt[];
  nextCursor?: string;
}

export interface GetPromptResult {
  description?: string;
  messages: Array<{ role: "user" | "assistant"; content: ToolContent | { type: "text"; text: string } }>;
}
