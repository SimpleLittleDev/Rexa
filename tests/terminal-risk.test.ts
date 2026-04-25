import { describe, expect, test } from "vitest";
import { RiskEngine } from "../src/agent/risk-engine";
import { TerminalTool } from "../src/tools/terminal/terminal.tool";

describe("Terminal risk handling", () => {
  test("detects destructive shell commands", () => {
    const risk = new RiskEngine().assessCommand("rm -rf ./data");

    expect(risk.level).toBe("high");
    expect(risk.requiresConfirmation).toBe(true);
  });

  test("refuses risky commands without confirmation", async () => {
    const terminal = new TerminalTool({ riskEngine: new RiskEngine() });

    const result = await terminal.run("rm -rf ./data", { cwd: process.cwd() });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("CONFIRMATION_REQUIRED");
  });
});
