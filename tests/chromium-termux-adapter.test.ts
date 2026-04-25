import { describe, expect, test } from "vitest";
import { ChromiumTermuxAdapter, type AndroidCommandExecutor } from "../src/tools/browser/chromium-termux.adapter";

describe("ChromiumTermuxAdapter", () => {
  test("opens URLs with Chromium commands instead of Android URL intents", async () => {
    const launched: Array<{ command: string; args: string[] }> = [];
    const adapter = new ChromiumTermuxAdapter({
      chromiumCommands: ["missing-chromium", "chromium-browser"],
      launchBrowser: async (command, args) => {
        launched.push({ command, args });
        if (command === "missing-chromium") throw Object.assign(new Error("not found"), { code: "ENOENT" });
      },
    });

    await adapter.open("https://www.google.com/search?q=YouTube");

    expect(launched).toEqual([
      { command: "missing-chromium", args: ["https://www.google.com/search?q=YouTube"] },
      { command: "chromium-browser", args: ["https://www.google.com/search?q=YouTube"] },
    ]);
  });

  test("uses /system/bin/screencap when screencap is not on PATH", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const exec: AndroidCommandExecutor = async (command, args) => {
      calls.push({ command, args });
      if (command === "screencap") throw Object.assign(new Error("spawn screencap ENOENT"), { code: "ENOENT" });
      return { stdout: "", stderr: "" };
    };
    const adapter = new ChromiumTermuxAdapter({ execFile: exec });

    await expect(adapter.screenshot("data/test-termux-screen.png")).resolves.toBe("data/test-termux-screen.png");
    expect(calls.map((call) => call.command)).toEqual(["screencap", "/system/bin/screencap"]);
  });

  test("uses /system/bin/input when input is not on PATH", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const exec: AndroidCommandExecutor = async (command, args) => {
      calls.push({ command, args });
      if (command === "input") throw Object.assign(new Error("spawn input ENOENT"), { code: "ENOENT" });
      return { stdout: "", stderr: "" };
    };
    const adapter = new ChromiumTermuxAdapter({ execFile: exec });

    await adapter.click(10, 20);

    expect(calls.map((call) => call.command)).toEqual(["input", "/system/bin/input"]);
  });

  test("falls back to Chromium headless screenshot when Android screencap fails", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const exec: AndroidCommandExecutor = async (command, args) => {
      calls.push({ command, args });
      if (command === "screencap") throw Object.assign(new Error("spawn screencap ENOENT"), { code: "ENOENT" });
      if (command === "/system/bin/screencap") throw new Error("Capturing failed");
      return { stdout: "28764 bytes written", stderr: "" };
    };
    const adapter = new ChromiumTermuxAdapter({
      execFile: exec,
      chromiumCommands: ["chromium-browser"],
      launchBrowser: async () => undefined,
    });

    await adapter.open("https://www.google.com/search?q=YouTube");
    await expect(adapter.screenshot("data/test-termux-headless.png")).resolves.toBe("data/test-termux-headless.png");

    expect(calls.at(-1)).toEqual({
      command: "chromium-browser",
      args: ["--headless", "--disable-gpu", "--screenshot=data/test-termux-headless.png", "https://www.google.com/search?q=YouTube"],
    });
  });
});
