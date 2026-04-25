import { describe, expect, test } from "vitest";
import { Orchestrator } from "../src/agent/orchestrator";
import { defaultAgentsConfig, defaultAppConfig } from "../src/app/config";
import type { LLMRequest, LLMResponse } from "../src/llm/llm-provider.interface";
import { LLMRouter } from "../src/llm/llm-router";
import { MemoryManager } from "../src/memory/memory-manager";
import { MemoryStorage } from "../src/storage/memory.storage";
import { BrowserTool, type BrowserAdapter } from "../src/tools/browser/browser.tool";
import type { BrowserAgentEvent } from "../src/tools/browser/browser-agent-observer";

class ThrowingProvider {
  readonly name = "throwing";
  readonly type = "api" as const;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(_input: LLMRequest): Promise<LLMResponse> {
    throw new Error("LLM should not be called for direct browser actions");
  }

  async *stream(_input: LLMRequest): AsyncGenerator<never> {
    return;
  }
}

class FakeBrowserAdapter implements BrowserAdapter {
  readonly actions: string[] = [];

  async open(url: string): Promise<void> {
    this.actions.push(`open:${url}`);
  }

  async screenshot(path?: string): Promise<Buffer | string> {
    this.actions.push(`screenshot:${path ?? "buffer"}`);
    return path ?? "buffer";
  }

  async moveMouse(x: number, y: number): Promise<void> {
    this.actions.push(`moveMouse:${x},${y}`);
  }

  async click(): Promise<void> {
    return;
  }

  async clickBySelector(): Promise<void> {
    return;
  }

  async clickByText(): Promise<void> {
    return;
  }

  async type(): Promise<void> {
    return;
  }

  async uploadFile(): Promise<void> {
    return;
  }

  async scroll(): Promise<void> {
    return;
  }

  async getDom(): Promise<string> {
    return "";
  }

  async getVisibleText(): Promise<string> {
    return "";
  }

  async findElement(): Promise<unknown> {
    return {};
  }

  async waitForNavigation(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    return;
  }
}

describe("Orchestrator browser actions", () => {
  test("executes BrowserTool and reports screenshots instead of returning a mock LLM answer", async () => {
    const storage = new MemoryStorage();
    const memory = new MemoryManager(storage);
    await memory.init();
    const router = new LLMRouter(
      { throwing: new ThrowingProvider() },
      { roles: { browser: { provider: "throwing", model: "none" }, main: { provider: "throwing", model: "none" } } },
    );
    const appConfig = {
      ...defaultAppConfig(),
      browserMode: "limited" as const,
      browserAgent: {
        ...defaultAppConfig().browserAgent,
        screenshotDir: "data/test-orchestrator-browser",
      },
    };
    const adapter = new FakeBrowserAdapter();
    const orchestrator = new Orchestrator(
      router,
      memory,
      defaultAgentsConfig(),
      appConfig,
      (options) =>
        new BrowserTool(adapter, {
          ...options,
          screenshotUpdates: true,
          screenshotDir: "data/test-orchestrator-browser",
          updateAfterActions: ["open", "moveMouse"],
        }),
    );
    const browserEvents: BrowserAgentEvent[] = [];

    const result = await orchestrator.handle("bisa buka browser dan cari YouTube?", {
      browserObserver: {
        onBrowserEvent: (event) => {
          browserEvents.push(event);
        },
      },
    });

    expect(result.status).toBe("completed");
    expect(result.response).toContain("https://www.google.com/search?q=YouTube");
    expect(result.response).not.toContain("mock response");
    expect(adapter.actions).toContain("open:https://www.google.com/search?q=YouTube");
    expect(browserEvents[0]?.screenshotPath).toContain("data/test-orchestrator-browser");
  });

  test("treats Indonesian open-site requests as browser tasks without calling an LLM", async () => {
    const storage = new MemoryStorage();
    const memory = new MemoryManager(storage);
    await memory.init();
    const router = new LLMRouter(
      { throwing: new ThrowingProvider() },
      { roles: { browser: { provider: "throwing", model: "none" }, main: { provider: "throwing", model: "none" } } },
    );
    const adapter = new FakeBrowserAdapter();
    const orchestrator = new Orchestrator(
      router,
      memory,
      defaultAgentsConfig(),
      defaultAppConfig(),
      () => new BrowserTool(adapter, { screenshotUpdates: false }),
    );

    const result = await orchestrator.handle("buka YouTube setelah itu resolve captcha nya");

    expect(result.status).toBe("completed");
    expect(adapter.actions).toContain("open:https://www.youtube.com");
    expect(result.response).toContain("Rexa tidak akan bypass atau solve CAPTCHA otomatis");
  });
});
