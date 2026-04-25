import type { BrowserAgentEvent, BrowserAgentObserver } from "../tools/browser/browser-agent-observer";
import type { ChatProvider } from "./chat-provider.interface";

export interface BrowserChatObserverOptions {
  showEvents?: boolean;
  sendScreenshots?: boolean;
  screenshotCaptions?: boolean;
}

export class BrowserChatObserver implements BrowserAgentObserver {
  constructor(
    private readonly provider: ChatProvider,
    private readonly userId: string,
    private readonly options: BrowserChatObserverOptions = {},
  ) {}

  async onBrowserEvent(event: BrowserAgentEvent): Promise<void> {
    if (this.options.showEvents) {
      await this.provider.sendMessage(this.userId, `Browser: ${event.message}`);
    }
    if (this.options.sendScreenshots && event.screenshotPath && this.provider.sendImage) {
      await this.provider.sendImage(this.userId, {
        path: event.screenshotPath,
        caption: this.options.screenshotCaptions ? event.message : undefined,
      });
    }
  }
}
