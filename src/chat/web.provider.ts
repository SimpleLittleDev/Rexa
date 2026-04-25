import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { ChatProvider, MessageHandler } from "./chat-provider.interface";

export class WebChatProvider implements ChatProvider {
  readonly name = "web";
  private handler: MessageHandler | null = null;

  constructor(private readonly port = Number(process.env.REXA_WEB_PORT ?? 8787)) {}

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    const server = createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve) => server.listen(this.port, "127.0.0.1", resolve));
  }

  async sendMessage(_userId: string, message: string): Promise<void> {
    console.log(message);
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "GET") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<!doctype html><html><head><title>Rexa</title></head><body><h1>Rexa</h1><form method="post"><input name="message" autofocus/><button>Send</button></form></body></html>`);
      return;
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      const text = new URLSearchParams(body).get("message") ?? body;
      await this.handler?.({ userId: "web", text });
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("accepted");
      return;
    }
    res.writeHead(404).end();
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
