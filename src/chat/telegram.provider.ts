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
    await this.bot.telegram.sendMessage(userId, message);
  }

  async sendImage(userId: string, image: { path: string; caption?: string }): Promise<void> {
    if (!this.bot) throw new Error("Telegram bot is not started");
    await this.bot.telegram.sendPhoto(userId, { source: image.path }, { caption: image.caption });
  }

  async sendConfirmation(userId: string, text: string): Promise<void> {
    if (!this.bot) throw new Error("Telegram bot is not started");
    await this.bot.telegram.sendMessage(userId, text, {
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
