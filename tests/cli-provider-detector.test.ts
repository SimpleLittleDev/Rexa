import { describe, expect, test } from "vitest";
import { CLIProviderDetector } from "../src/llm/cli-provider-detector";

describe("CLIProviderDetector", () => {
  test("reports Codex install instructions when binary is missing", async () => {
    const detector = new CLIProviderDetector({
      homeDir: "/tmp/rexa-test-home",
      runCommand: async (command) => {
        if (command === "node" || command === "npm") {
          return { exitCode: 0, stdout: "v20.0.0", stderr: "" };
        }
        return { exitCode: 127, stdout: "", stderr: "not found" };
      },
      fileExists: async () => false,
    });

    const status = await detector.checkCodexCLI();

    expect(status).toMatchObject({
      provider: "codex-cli",
      binary: "codex",
      installed: false,
      authenticated: false,
      ready: false,
      installCommand: "npm install -g @openai/codex",
      authCommand: "codex",
    });
    expect(status.error).toContain("binary not found");
  });

  test("marks Claude Code as needs auth when binary exists without session signal", async () => {
    const detector = new CLIProviderDetector({
      homeDir: "/tmp/rexa-test-home",
      runCommand: async (command) => {
        if (command === "claude") {
          return { exitCode: 0, stdout: "1.0.0", stderr: "" };
        }
        return { exitCode: 0, stdout: "ok", stderr: "" };
      },
      fileExists: async () => false,
    });

    const status = await detector.checkClaudeCodeCLI();

    expect(status.installed).toBe(true);
    expect(status.authenticated).toBe(false);
    expect(status.ready).toBe(false);
    expect(status.error).toContain("needs auth");
  });
});
