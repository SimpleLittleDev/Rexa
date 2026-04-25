import type { MainAgent } from "../agent/main-agent";
import type { RexaRunOptions, RexaRunResult } from "../agent/orchestrator";
import { BrowserChatObserver } from "./browser-chat-observer";
import type { ChatProvider } from "./chat-provider.interface";

export interface ChatAgentLike {
  run(
    message: string,
    options: RexaRunOptions,
  ): Promise<RexaRunResult>;
}

export interface ChatRunnerOptions {
  showInternalProgress?: boolean;
  showBrowserEvents?: boolean;
  sendBrowserScreenshots?: boolean;
  showBrowserScreenshotCaptions?: boolean;
}

export function attachAgentToChatProvider(
  provider: ChatProvider,
  agent: MainAgent | ChatAgentLike,
  options: ChatRunnerOptions = {},
): void {
  provider.onMessage(async (message) => {
    try {
      const browserObserver = options.showBrowserEvents || options.sendBrowserScreenshots
        ? new BrowserChatObserver(provider, message.userId, {
          showEvents: options.showBrowserEvents,
          sendScreenshots: options.sendBrowserScreenshots,
          screenshotCaptions: options.showBrowserScreenshotCaptions,
        })
        : undefined;
      const result = await agent.run(message.text, {
        userId: message.userId,
        browserObserver,
        onProgress: options.showInternalProgress
          ? (progress) => provider.sendMessage(message.userId, cleanChatText(progress))
          : undefined,
      });
      await provider.sendMessage(message.userId, cleanChatText(result.response));
    } catch (error) {
      await provider.sendMessage(message.userId, cleanChatText(`Rexa error: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}

export function cleanChatText(text: string): string {
  return text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "").trim();
}
