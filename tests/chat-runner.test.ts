import { describe, expect, test } from "vitest";
import { attachAgentToChatProvider } from "../src/chat/chat-runner";
import type { ChatMessage, ChatProvider, MessageHandler } from "../src/chat/chat-provider.interface";
import type { RexaRunOptions } from "../src/agent/orchestrator";

class FakeChatProvider implements ChatProvider {
  readonly name = "fake";
  sent: Array<{ userId: string; message: string }> = [];
  images: Array<{ userId: string; path: string; caption?: string }> = [];
  private handler: MessageHandler | null = null;

  async start(): Promise<void> {
    return;
  }

  async sendMessage(userId: string, message: string): Promise<void> {
    this.sent.push({ userId, message });
  }

  async sendImage(userId: string, image: { path: string; caption?: string }): Promise<void> {
    this.images.push({ userId, ...image });
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async emit(message: ChatMessage): Promise<void> {
    await this.handler?.(message);
  }
}

describe("attachAgentToChatProvider", () => {
  test("sends only the final response by default and hides internal progress", async () => {
    const provider = new FakeChatProvider();
    attachAgentToChatProvider(provider, {
      run: async (_text: string, options: RexaRunOptions) => {
        await options.onProgress?.("planning");
        return {
          taskId: "task_1",
          status: "completed",
          response: "final answer",
          plan: [],
          subagents: [],
        };
      },
    });

    await provider.emit({ userId: "u1", text: "hello" });

    expect(provider.sent).toEqual([{ userId: "u1", message: "final answer" }]);
  });

  test("strips terminal ANSI codes before sending user-facing chat messages", async () => {
    const provider = new FakeChatProvider();
    attachAgentToChatProvider(provider, {
      run: async () => ({
        taskId: "task_1",
        status: "completed",
        response: "\u001b[2mfinal answer\u001b[0m",
        plan: [],
        subagents: [],
      }),
    });

    await provider.emit({ userId: "u1", text: "hello" });

    expect(provider.sent).toEqual([{ userId: "u1", message: "final answer" }]);
  });

  test("does not expose browser system events by default", async () => {
    const provider = new FakeChatProvider();
    attachAgentToChatProvider(provider, {
      run: async (_text: string, options: RexaRunOptions) => {
        await options.browserObserver?.onBrowserEvent({
          action: "open",
          message: "Membuka browser: https://example.com",
          screenshotPath: "data/shot.png",
        });
        return {
          taskId: "task_1",
          status: "completed",
          response: "done",
          plan: [],
          subagents: [],
        };
      },
    });

    await provider.emit({ userId: "u1", text: "buka browser" });

    expect(provider.sent).toEqual([{ userId: "u1", message: "done" }]);
    expect(provider.images).toEqual([]);
  });

  test("passes a browser observer only when browser updates are explicitly enabled", async () => {
    const provider = new FakeChatProvider();
    let hasBrowserObserver = false;
    attachAgentToChatProvider(provider, {
      run: async (_text: string, options: RexaRunOptions) => {
        hasBrowserObserver = Boolean(options.browserObserver);
        return {
          taskId: "task_1",
          status: "completed",
          response: "done",
          plan: [],
          subagents: [],
        };
      },
    }, { showBrowserEvents: true });

    await provider.emit({ userId: "u1", text: "buka browser" });

    expect(hasBrowserObserver).toBe(true);
  });

  test("can stream browser screenshots without event captions when enabled", async () => {
    const provider = new FakeChatProvider();
    attachAgentToChatProvider(provider, {
      run: async (_text: string, options: RexaRunOptions) => {
        await options.browserObserver?.onBrowserEvent({
          action: "open",
          message: "Membuka browser: https://example.com",
          screenshotPath: "data/shot.png",
        });
        return {
          taskId: "task_1",
          status: "completed",
          response: "done",
          plan: [],
          subagents: [],
        };
      },
    }, { sendBrowserScreenshots: true });

    await provider.emit({ userId: "u1", text: "buka browser" });

    expect(provider.sent).toEqual([{ userId: "u1", message: "done" }]);
    expect(provider.images).toEqual([{ userId: "u1", path: "data/shot.png", caption: undefined }]);
  });
});
