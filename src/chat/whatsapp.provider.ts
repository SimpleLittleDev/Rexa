import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { resolveRexaHome } from "../app/paths";
import { logger } from "../logs/logger";
import type { ChatProvider, MessageHandler } from "./chat-provider.interface";

/**
 * QR-based WhatsApp provider using Baileys (`@whiskeysockets/baileys`).
 *
 * No Cloud API token, no phone number ID, no webhook required.
 * On first run a QR shows in the terminal — scan with the WhatsApp mobile app
 * (Linked Devices). Auth state persists in `<REXA_HOME>/data/whatsapp/auth/`
 * so subsequent runs reconnect automatically.
 *
 * Baileys is loaded lazily so it stays an optional peer dependency.
 *
 *     npm install @whiskeysockets/baileys qrcode-terminal pino
 */

const requireOptional = createRequire(__filename);

export interface WhatsAppProviderOptions {
  /** Override the auth state directory (default: <home>/data/whatsapp/auth). */
  authDir?: string;
  /** Print the QR to stdout when one is requested (default: true). */
  printQR?: boolean;
  /** Browser identifier reported to WhatsApp Web. */
  browserName?: string;
}

export class WhatsAppChatProvider implements ChatProvider {
  readonly name = "whatsapp";
  private handler: MessageHandler | null = null;
  private socket: any | null = null;
  private state: any | null = null;
  private saveCreds: (() => Promise<void>) | null = null;
  private readonly authDir: string;
  private readonly printQR: boolean;
  private readonly browserName: string;
  private connected = false;

  constructor(options: WhatsAppProviderOptions = {}) {
    const home = resolveRexaHome();
    this.authDir = options.authDir ?? join(home, "data", "whatsapp", "auth");
    this.printQR = options.printQR ?? true;
    this.browserName = options.browserName ?? "Rexa";
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    await mkdir(this.authDir, { recursive: true });

    let baileys: any;
    let qrcodeTerminal: any;
    try {
      baileys = requireOptional("@whiskeysockets/baileys");
      qrcodeTerminal = requireOptional("qrcode-terminal");
    } catch {
      throw new Error(
        "WhatsApp QR provider requires `@whiskeysockets/baileys` and `qrcode-terminal`.\n" +
          "Install them: npm install @whiskeysockets/baileys qrcode-terminal",
      );
    }

    const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    this.state = state;
    this.saveCreds = saveCreds;
    const { version } = await fetchLatestBaileysVersion();

    this.socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false, // we render manually below
      browser: [this.browserName, "Chrome", "0.2.0"],
      syncFullHistory: false,
    });

    this.socket.ev.on("creds.update", () => saveCreds());

    this.socket.ev.on("connection.update", (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr && this.printQR) {
        process.stdout.write("\n");
        process.stdout.write("Scan QR ini dari WhatsApp → Linked Devices:\n\n");
        qrcodeTerminal.generate(qr, { small: true });
        process.stdout.write("\n");
      }
      if (connection === "open") {
        this.connected = true;
        logger.info("[whatsapp] connected", { user: this.socket.user?.id });
      } else if (connection === "close") {
        this.connected = false;
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        logger.warn("[whatsapp] disconnected", { code, shouldReconnect });
        if (shouldReconnect) {
          // Brief backoff then re-init.
          setTimeout(() => this.start().catch((err) => logger.error("[whatsapp] reconnect failed", { err: String(err) })), 2_000);
        }
      }
    });

    this.socket.ev.on("messages.upsert", async (event: any) => {
      if (event.type !== "notify") return;
      for (const msg of event.messages ?? []) {
        if (msg.key?.fromMe) continue;
        const userId = msg.key?.remoteJid;
        if (!userId) continue;
        const text = extractText(msg.message);
        if (!text) continue;
        try {
          await this.handler?.({ userId, text, metadata: { messageId: msg.key.id, pushName: msg.pushName } });
        } catch (err) {
          logger.error("[whatsapp] handler error", { err: String(err) });
        }
      }
    });
  }

  async sendMessage(userId: string, message: string): Promise<void> {
    if (!this.socket) throw new Error("WhatsApp provider not started");
    await this.waitForConnection(15_000);
    await this.socket.sendMessage(userId, { text: message.slice(0, 4_000) });
  }

  async sendImage(userId: string, image: { path: string; caption?: string }): Promise<void> {
    if (!this.socket) throw new Error("WhatsApp provider not started");
    await this.waitForConnection(15_000);
    if (!existsSync(image.path)) throw new Error(`Image not found: ${image.path}`);
    const buffer = await readFile(image.path);
    await this.socket.sendMessage(userId, { image: buffer, caption: image.caption ?? "" });
  }

  /** Status helper exposed for `rexa doctor` / `rexa whatsapp status`. */
  status(): { paired: boolean; user: string | null; authDir: string } {
    return {
      paired: Boolean(this.state?.creds?.registered),
      user: this.socket?.user?.id ?? null,
      authDir: this.authDir,
    };
  }

  /** Wipe the local session — next start() will require a new QR scan. */
  async logout(): Promise<void> {
    try {
      await this.socket?.logout?.();
    } catch {
      // Ignore — we're tearing down anyway.
    }
    await rm(this.authDir, { recursive: true, force: true });
    await mkdir(this.authDir, { recursive: true });
  }

  private async waitForConnection(timeoutMs: number): Promise<void> {
    if (this.connected) return;
    const deadline = Date.now() + timeoutMs;
    while (!this.connected && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!this.connected) throw new Error("WhatsApp socket not connected (scan QR first)");
  }
}

function extractText(message: any): string | null {
  if (!message) return null;
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  return null;
}
