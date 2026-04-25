import { createInterface, type Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ChatMessage, ChatProvider, MessageHandler } from "./chat-provider.interface";

export class CLIChatProvider implements ChatProvider {
  readonly name = "cli";
  private handler: MessageHandler | null = null;
  private rl: Interface | null = null;

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    this.rl = createInterface({ input, output });
    output.write("Rexa CLI ready. Ketik pesan, atau /exit untuk keluar.\n");
    while (true) {
      const text = await this.askLine("you> ");
      if (text === null) break;
      if (text.trim() === "/exit") break;
      await this.handler?.({ userId: "local", text });
    }
    this.rl.close();
  }

  async sendMessage(_userId: string, message: string): Promise<void> {
    output.write(`rexa> ${message}\n`);
  }

  async sendImage(_userId: string, image: { path: string; caption?: string }): Promise<void> {
    output.write(`rexa> [screenshot] ${image.path}${image.caption ? ` - ${image.caption}` : ""}\n`);
  }

  async askConfirmation(prompt: string): Promise<boolean> {
    this.rl ??= createInterface({ input, output });
    const answer = await this.askLine(`${prompt} (y/N) `);
    if (answer === null) return false;
    return /^y(es)?$/i.test(answer.trim());
  }

  private async askLine(prompt: string): Promise<string | null> {
    try {
      return await this.rl!.question(prompt);
    } catch (error) {
      if (error instanceof Error && /readline was closed|ERR_USE_AFTER_CLOSE/.test(error.message)) {
        return null;
      }
      throw error;
    }
  }
}
