import { describe, expect, test } from "vitest";
import { ConfirmationGate } from "../src/agent/confirmation-gate";
import { PermissionManager } from "../src/security/permissions";

describe("security gates", () => {
  test("requires confirmation for destructive permissions in every mode", () => {
    const permissions = new PermissionManager("power-user");

    const decision = permissions.evaluate("file.delete");

    expect(decision.allowed).toBe(false);
    expect(decision.needsConfirmation).toBe(true);
  });

  test("returns rejected confirmation when user declines", async () => {
    const gate = new ConfirmationGate(async () => false);

    const decision = await gate.request({
      userId: "local",
      action: "Delete file",
      impact: "Removes data from disk",
      dataUsed: ["/tmp/a.txt"],
      command: "rm /tmp/a.txt",
    });

    expect(decision.approved).toBe(false);
    expect(decision.status).toBe("rejected");
  });
});
