import { createRequire } from "node:module";
import type { ChatProvider, MessageHandler } from "./chat-provider.interface";

const requireOptional = createRequire(__filename);

export class TelegramChatProvider implements ChatProvider {
  readonly name = "telegram";
  private handler: MessageHandler | null = null;
  private bot: any | null = null;

  constructor(private readonly token = process.env.TELEGRAM_BOT_TOKEN) {}

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    if (!this.token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
    let Telegraf: any;
    try {
      Telegraf = requireOptional("telegraf").Telegraf;
    } catch {
      throw new Error("Telegram provider requires optional package 'telegraf'.");
    }
    this.bot = new Telegraf(this.token);
    this.bot.on("text", async (ctx: any) => {
      await this.handler?.({
        userId: String(ctx.from?.id ?? "telegram"),
        text: ctx.message?.text ?? "",
        metadata: { chatId: ctx.chat?.id },
      });
    });
    await this.bot.launch();
  }

  async sendMessage(userId: string, message: string): Promise<void> {
    if (!this.bot) throw new Error("Telegram bot is not started");
    // Telegram caps a single text message at 4096 UTF-16 code units. We
    // split on paragraph boundaries first, then on newlines, then on
    // whitespace as a last resort so we don't break mid-word.
    for (const chunk of splitForTelegram(message, 4000)) {
      await this.bot.telegram.sendMessage(userId, chunk);
    }
  }

  async sendImage(userId: string, image: { path: string; caption?: string }): Promise<void> {
    if (!this.bot) throw new Error("Telegram bot is not started");
    await this.bot.telegram.sendPhoto(userId, { source: image.path }, { caption: image.caption });
  }

  async sendConfirmation(userId: string, text: string): Promise<void> {
    if (!this.bot) throw new Error("Telegram bot is not started");
    const chunks = splitForTelegram(text, 4000);
    for (let i = 0; i < chunks.length - 1; i += 1) {
      await this.bot.telegram.sendMessage(userId, chunks[i]);
    }
    await this.bot.telegram.sendMessage(userId, chunks[chunks.length - 1] ?? "", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Approve", callback_data: "approve" },
            { text: "Reject", callback_data: "reject" },
          ],
        ],
      },
    });
  }
}

/**
 * Split a long message into Telegram-safe chunks. Prefers splitting on
 * paragraph (\n\n), then newline, then whitespace; falls back to a hard
 * slice if a single line is too long. Exported so other surfaces can
 * reuse the same logic.
 */
export function splitForTelegram(text: string, maxLength: number): string[] {
  const safe = typeof text === "string" ? text : String(text);
  if (safe.length <= maxLength) return [safe || ""];
  const chunks: string[] = [];
  let remaining = safe;
  while (remaining.length > maxLength) {
    let cut = lastIndexBefore(remaining, "\n\n", maxLength);
    if (cut < 0) cut = lastIndexBefore(remaining, "\n", maxLength);
    if (cut < 0) cut = lastIndexBefore(remaining, " ", maxLength);
    if (cut < maxLength * 0.5) cut = maxLength; // avoid tiny first chunks
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function lastIndexBefore(text: string, needle: string, limit: number): number {
  const idx = text.lastIndexOf(needle, limit);
  return idx > 0 ? idx + needle.length : -1;
}
