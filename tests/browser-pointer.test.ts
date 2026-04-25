import { describe, expect, test } from "vitest";
import { PointerController } from "../src/tools/browser/pointer.controller";

describe("PointerController", () => {
  test("tracks pointer movement and click coordinates", async () => {
    const events: Array<{ type: string; x: number; y: number }> = [];
    const pointer = new PointerController({
      move: async (x, y) => {
        events.push({ type: "move", x, y });
      },
      click: async (x, y) => {
        events.push({ type: "click", x, y });
      },
    });

    await pointer.moveMouse(30, 50);
    await pointer.click(30, 50);

    expect(pointer.position()).toEqual({ x: 30, y: 50 });
    expect(events).toEqual([
      { type: "move", x: 30, y: 50 },
      { type: "click", x: 30, y: 50 },
    ]);
  });
});
