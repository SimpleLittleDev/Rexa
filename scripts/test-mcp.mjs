#!/usr/bin/env node
// Smoke test: spin up a minimal MCP server in-process, connect via the
// stdio transport, run the initialize handshake, and call a tool.
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { McpClient } = await import("../dist/src/mcp/mcp-client.js");
const { StdioTransport } = await import("../dist/src/mcp/mcp-transport.js");
const { MCPRegistry } = await import("../dist/src/mcp/mcp-registry.js");

// Fake MCP server written in plain JS — speaks the JSON-RPC framing
// expected by our client. Keeps the smoke test self-contained.
const serverDir = mkdtempSync(join(tmpdir(), "rexa-mcp-"));
const serverPath = join(serverDir, "server.js");
writeFileSync(
  serverPath,
  `
process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.method === 'initialize') {
      send({ jsonrpc: '2.0', id: msg.id, result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'fake-mcp', version: '1.0.0' },
        capabilities: { tools: {} }
      }});
    } else if (msg.method === 'notifications/initialized') {
      // no-op
    } else if (msg.method === 'tools/list') {
      send({ jsonrpc: '2.0', id: msg.id, result: { tools: [
        { name: 'echo', description: 'echo back', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
      ] }});
    } else if (msg.method === 'tools/call') {
      const text = msg.params?.arguments?.text ?? '';
      send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'echo:' + text }] }});
    } else if (msg.method === 'shutdown') {
      send({ jsonrpc: '2.0', id: msg.id, result: null });
    }
  }
});
function send(msg) { process.stdout.write(JSON.stringify(msg) + '\\n'); }
`,
);

let pass = 0;
let fail = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log("✔", name);
    pass++;
  } catch (error) {
    console.error("✘", name, "—", error.message);
    fail++;
  }
}

await test("StdioTransport+McpClient handshake", async () => {
  const transport = new StdioTransport({ command: process.execPath, args: [serverPath] });
  const client = new McpClient(transport, { requestTimeoutMs: 5000 });
  const init = await client.connect();
  assert.equal(init.serverInfo.name, "fake-mcp");
  const tools = await client.listTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, "echo");
  const result = await client.callTool("echo", { text: "hello" });
  assert.deepEqual(result.content, [{ type: "text", text: "echo:hello" }]);
  await client.close();
});

await test("MCPRegistry.connectAll exposes ToolHandlers", async () => {
  const registry = new MCPRegistry();
  const handles = await registry.connectAll([
    { name: "fake", command: process.execPath, args: [serverPath] },
  ]);
  assert.equal(handles.length, 1);
  assert.equal(handles[0].toolDefinitions.length, 1);
  assert.equal(handles[0].toolDefinitions[0].name, "mcp__fake__echo");
  const exec = handles[0].toolHandlers[0].execute;
  const result = await exec({ text: "world" }, {});
  assert.equal(result, "echo:world");
  await registry.closeAll();
});

await test("MCPRegistry handles failing server gracefully", async () => {
  const registry = new MCPRegistry();
  const handles = await registry.connectAll([
    { name: "broken", command: "/nonexistent/binary-that-does-not-exist", args: [] },
  ]);
  assert.equal(handles.length, 1);
  assert.ok(handles[0].error, "expected error to be captured");
  await registry.closeAll();
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
