import { describe, expect, test } from "vitest";
import { buildCodexExecOptions, CodexCLIProvider, parseCodexTextOutput } from "../src/llm/providers/codex-cli.provider";

describe("CodexCLIProvider", () => {
  test("builds exec args with skip git check and prompt through stdin", () => {
    const options = buildCodexExecOptions("gpt-5.5", "Reply exactly: ok");

    expect(options.args).toEqual(["exec", "--model", "gpt-5.5", "--skip-git-repo-check", "--color", "never", "-"]);
    expect(options.input).toBe("Reply exactly: ok");
  });

  test("uses codex output instead of falling back when CLI runner succeeds", async () => {
    const provider = new CodexCLIProvider(
      {
        checkCodexCLI: async () => ({
          provider: "codex-cli",
          binary: "codex",
          installed: true,
          authenticated: true,
          version: "test",
          ready: true,
          installCommand: "npm install -g @openai/codex",
          authCommand: "codex",
          error: null,
        }),
      },
      {
        runCLI: async (options) => {
          expect(options.args).toContain("--skip-git-repo-check");
          expect(options.input).toContain("USER: hi");
          return { exitCode: 0, stdout: "halo dari codex", stderr: "" };
        },
      },
    );

    const response = await provider.generate({ model: "gpt-5.5", messages: [{ role: "user", content: "hi" }] });

    expect(response.provider).toBe("codex-cli");
    expect(response.text).toBe("halo dari codex");
  });

  test("extracts the final assistant response from Codex exec transcript", () => {
    const raw = [
      "OpenAI Codex v0.124.0-termux (research preview)",
      "--------",
      "user",
      "Reply exactly: ok",
      "codex",
      "ok",
      "tokens used",
      "20.045",
    ].join("\n");

    expect(parseCodexTextOutput(raw)).toBe("ok");
  });
});
