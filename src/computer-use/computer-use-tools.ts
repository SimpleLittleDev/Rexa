import { readFile } from "node:fs/promises";
import type { ToolHandler } from "../tools/tool-dispatcher";
import type { ComputerUseManager } from "./computer-use-manager";
import type { ScrollDirection } from "./computer-use-types";

/**
 * Exposes ComputerUseManager as a set of LLM tool handlers under the
 * `os.*` namespace. Every action returns a structured result so the
 * model can see what happened (or why it failed).
 */
export function buildComputerUseTools(manager: ComputerUseManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "os.screenshot",
        description:
          "Capture a screenshot of the current desktop and return its file path. Optionally pass `returnBase64=true` to also embed the PNG as a data URI for vision LLMs.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Optional output path." },
            returnBase64: { type: "boolean", default: false },
          },
        },
      },
      execute: async (args) => {
        const shot = await manager.screenshot(stringOrUndefined(args.path));
        const out: Record<string, unknown> = { ...shot };
        if (args.returnBase64 === true) {
          const buffer = await readFile(shot.path);
          out.dataUri = `data:image/png;base64,${buffer.toString("base64")}`;
        }
        return out;
      },
    },
    {
      definition: {
        name: "os.click",
        description: "Click at absolute screen coordinates. Supports left/right/middle and double-click.",
        parameters: {
          type: "object",
          required: ["x", "y"],
          properties: {
            x: { type: "integer" },
            y: { type: "integer" },
            button: { type: "string", enum: ["left", "right", "middle"], default: "left" },
            doubleClick: { type: "boolean", default: false },
          },
        },
      },
      execute: async (args) => {
        const x = numberOr(args.x);
        const y = numberOr(args.y);
        if (x === null || y === null) return { error: "x and y are required" };
        await manager.click(x, y, {
          button: args.button as "left" | "right" | "middle" | undefined,
          doubleClick: args.doubleClick === true,
        });
        return { ok: true };
      },
    },
    {
      definition: {
        name: "os.move",
        description: "Move the cursor to absolute screen coordinates without clicking.",
        parameters: {
          type: "object",
          required: ["x", "y"],
          properties: { x: { type: "integer" }, y: { type: "integer" } },
        },
      },
      execute: async (args) => {
        const x = numberOr(args.x);
        const y = numberOr(args.y);
        if (x === null || y === null) return { error: "x and y are required" };
        await manager.moveMouse(x, y);
        return { ok: true };
      },
    },
    {
      definition: {
        name: "os.type",
        description: "Type literal text into whatever currently has keyboard focus.",
        parameters: {
          type: "object",
          required: ["text"],
          properties: { text: { type: "string" } },
        },
      },
      execute: async (args) => {
        const text = String(args.text ?? "");
        await manager.type(text);
        return { ok: true, length: text.length };
      },
    },
    {
      definition: {
        name: "os.key",
        description: "Press a keyboard key (e.g. 'Return', 'Escape'). Modifiers via `modifiers: ['ctrl','shift']`.",
        parameters: {
          type: "object",
          required: ["key"],
          properties: {
            key: { type: "string" },
            modifiers: { type: "array", items: { type: "string" } },
          },
        },
      },
      execute: async (args) => {
        const key = String(args.key ?? "");
        if (!key) return { error: "key is required" };
        const modifiers = Array.isArray(args.modifiers)
          ? (args.modifiers as string[]).filter(Boolean)
          : undefined;
        await manager.key(key, modifiers ? { modifiers: modifiers as ("shift" | "ctrl" | "alt" | "meta" | "super")[] } : undefined);
        return { ok: true };
      },
    },
    {
      definition: {
        name: "os.scroll",
        description: "Scroll the wheel at (x, y) in a direction.",
        parameters: {
          type: "object",
          required: ["x", "y", "direction"],
          properties: {
            x: { type: "integer" },
            y: { type: "integer" },
            direction: { type: "string", enum: ["up", "down", "left", "right"] },
            amount: { type: "integer", minimum: 1, maximum: 50, default: 3 },
          },
        },
      },
      execute: async (args) => {
        const x = numberOr(args.x);
        const y = numberOr(args.y);
        if (x === null || y === null) return { error: "x and y are required" };
        await manager.scroll(x, y, args.direction as ScrollDirection, numberOr(args.amount) ?? 3);
        return { ok: true };
      },
    },
  ];
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberOr(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}
