import { createRequire } from "node:module";
import type { ChatProvider, MessageHandler } from "./chat-provider.interface";

const requireOptional = createRequire(__filename);

export class WebSocketChatProvider implements ChatProvider {
  readonly name = "websocket";
  private handler: MessageHandler | null = null;
  private server: any | null = null;

  constructor(private readonly port = Number(process.env.REXA_WS_PORT ?? 8788)) {}

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    let WebSocketServer: any;
    try {
      WebSocketServer = requireOptional("ws").WebSocketServer;
    } catch {
      throw new Error("WebSocket provider requires optional package 'ws'.");
    }
    this.server = new WebSocketServer({ port: this.port });
    this.server.on("connection", (socket: any) => {
      socket.on("message", async (raw: Buffer) => {
        await this.handler?.({ userId: "websocket", text: raw.toString() });
      });
    });
  }

  async sendMessage(_userId: string, message: string): Promise<void> {
    if (!this.server) throw new Error("WebSocket server is not started");
    for (const client of this.server.clients) {
      client.send(message);
    }
  }

  async sendImage(_userId: string, image: { path: string; caption?: string }): Promise<void> {
    if (!this.server) throw new Error("WebSocket server is not started");
    const payload = JSON.stringify({ type: "image", ...image });
    for (const client of this.server.clients) {
      client.send(payload);
    }
  }
}
