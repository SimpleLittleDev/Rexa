import { describe, expect, test } from "vitest";
import { MockProvider } from "../src/llm/providers/mock.provider";

describe("MockProvider", () => {
  test("does not echo long memory context back to the user", async () => {
    const provider = new MockProvider();

    const response = await provider.generate({
      model: "local-mock",
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "User request: hai\n\nMemory:\n- noisy old mock result\nSub-agent RuntimeWorker: failed" },
      ],
    });

    expect(response.text).toContain("hai");
    expect(response.text).not.toContain("noisy old mock result");
    expect(response.text).not.toContain("Sub-agent RuntimeWorker");
  });
});
