import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { ChatProvider, MessageHandler } from "./chat-provider.interface";

export interface WhatsAppProviderOptions {
  accessToken?: string;
  phoneNumberId?: string;
  verifyToken?: string;
  port?: number;
  mode?: "cloud-api" | "webhook-only";
}

export class WhatsAppChatProvider implements ChatProvider {
  readonly name = "whatsapp";
  private handler: MessageHandler | null = null;
  private server: ReturnType<typeof createServer> | null = null;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly verifyToken: string;
  private readonly port: number;
  private readonly mode: "cloud-api" | "webhook-only";

  constructor(options: WhatsAppProviderOptions = {}) {
    this.accessToken = options.accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN ?? "";
    this.phoneNumberId = options.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
    this.verifyToken = options.verifyToken ?? process.env.WHATSAPP_VERIFY_TOKEN ?? "";
    this.port = options.port ?? Number(process.env.REXA_WHATSAPP_PORT ?? 8792);
    this.mode = options.mode ?? "cloud-api";
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    if (!this.verifyToken || (this.mode === "cloud-api" && (!this.accessToken || !this.phoneNumberId))) {
      throw new Error("WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_VERIFY_TOKEN.");
    }
    this.server = createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve) => this.server!.listen(this.port, "127.0.0.1", resolve));
  }

  async sendMessage(userId: string, message: string): Promise<void> {
    if (this.mode === "webhook-only") return;
    await this.sendCloudMessage(userId, { type: "text", text: { body: message.slice(0, 4000) } });
  }

  async sendImage(userId: string, image: { path: string; caption?: string }): Promise<void> {
    await this.sendMessage(userId, `${image.caption ?? "Browser screenshot"}\n${image.path}`);
  }

  url(): string {
    const address = this.server?.address() as AddressInfo | null;
    return `http://127.0.0.1:${address?.port ?? this.port}/webhook`;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "GET") {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === this.verifyToken && challenge) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(challenge);
        return;
      }
      res.writeHead(403).end("verification failed");
      return;
    }

    if (req.method === "POST") {
      const body = JSON.parse(await readBody(req) || "{}") as WhatsAppWebhookPayload;
      for (const message of extractMessages(body)) {
        await this.handler?.({
          userId: message.from,
          text: message.text,
          metadata: { provider: "whatsapp" },
        });
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404).end();
  }

  private async sendCloudMessage(to: string, payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        ...payload,
      }),
    });
    if (!response.ok) throw new Error(`WhatsApp send failed: ${response.status} ${await response.text()}`);
  }
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          text?: { body?: string };
          type?: string;
        }>;
      };
    }>;
  }>;
}

function extractMessages(payload: WhatsAppWebhookPayload): Array<{ from: string; text: string }> {
  const messages: Array<{ from: string; text: string }> = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.from && message.text?.body) {
          messages.push({ from: message.from, text: message.text.body });
        }
      }
    }
  }
  return messages;
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
