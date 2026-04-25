import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ToolHandler } from "../tools/tool-dispatcher";
import { CodeSearch } from "./code-search";
import { applyPatch, readFileSlice, validatePatch } from "./patch";

export interface CodeToolDeps {
  /** Repository root used as default working directory. */
  rootDir: string;
}

/**
 * Build the code-intelligence tool handler set. The orchestrator
 * registers these alongside the other tools so the model can call
 * them via function-calling.
 */
export function buildCodeTools(deps: CodeToolDeps): ToolHandler[] {
  const search = new CodeSearch(deps.rootDir);

  return [
    {
      definition: {
        name: "code.search",
        description:
          "Repository-wide regex search via ripgrep. Returns up to `limit` matches with path, line, column, and matching line text.",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Regex pattern to search for." },
            glob: { type: "string", description: "Optional glob to restrict files (e.g. '**/*.ts')." },
            limit: { type: "number", description: "Maximum results. Default 100." },
            caseInsensitive: { type: "boolean", description: "Case-insensitive search." },
          },
          required: ["pattern"],
        },
      },
      execute: async (args) => {
        const pattern = String(args.pattern);
        return search.searchPattern(pattern, {
          glob: args.glob ? String(args.glob) : undefined,
          limit: typeof args.limit === "number" ? args.limit : undefined,
          caseInsensitive: Boolean(args.caseInsensitive),
        });
      },
    },
    {
      definition: {
        name: "code.findDefinition",
        description:
          "Heuristic find-definition for an identifier (function/class/const/etc). Optionally restrict by language.",
        parameters: {
          type: "object",
          properties: {
            identifier: { type: "string" },
            language: {
              type: "string",
              description: "Language hint: typescript|javascript|python|go|rust|java|ruby. Optional.",
            },
          },
          required: ["identifier"],
        },
      },
      execute: async (args) => {
        return search.findDefinition(String(args.identifier), args.language ? String(args.language) : undefined);
      },
    },
    {
      definition: {
        name: "code.findReferences",
        description: "Find all references to an identifier across the repo.",
        parameters: {
          type: "object",
          properties: {
            identifier: { type: "string" },
            language: { type: "string" },
          },
          required: ["identifier"],
        },
      },
      execute: async (args) => {
        return search.findReferences(String(args.identifier), args.language ? String(args.language) : undefined);
      },
    },
    {
      definition: {
        name: "code.outline",
        description: "Return the outline (top-level symbols) for a single source file.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
        },
      },
      execute: async (args) => search.outline(String(args.path)),
    },
    {
      definition: {
        name: "code.readSlice",
        description: "Read a 1-based inclusive slice of a file. Use for showing the model context before patching.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            startLine: { type: "number" },
            endLine: { type: "number" },
          },
          required: ["path"],
        },
      },
      execute: async (args) => {
        const fullPath = resolve(deps.rootDir, String(args.path));
        return readFileSlice(
          fullPath,
          typeof args.startLine === "number" ? args.startLine : 1,
          typeof args.endLine === "number" ? args.endLine : Infinity,
        );
      },
    },
    {
      definition: {
        name: "code.validatePatch",
        description:
          "Validate a unified-diff patch against the working tree (parses hunks + runs `git apply --check`). Returns errors/warnings without applying.",
        parameters: {
          type: "object",
          properties: { diff: { type: "string" } },
          required: ["diff"],
        },
      },
      execute: async (args) => validatePatch(String(args.diff), deps.rootDir),
    },
    {
      definition: {
        name: "code.applyPatch",
        description:
          "Apply a unified-diff patch via `git apply`. Caller should run `code.validatePatch` first; on validation failure the model should iterate.",
        parameters: {
          type: "object",
          properties: { diff: { type: "string" } },
          required: ["diff"],
        },
      },
      execute: async (args) => {
        const diff = String(args.diff);
        const validation = await validatePatch(diff, deps.rootDir);
        if (!validation.ok) {
          return { applied: false, validation };
        }
        await applyPatch(diff, deps.rootDir);
        return { applied: true, validation };
      },
    },
    {
      definition: {
        name: "code.writeFile",
        description: "Write a full file (UTF-8). Use for new file creation; prefer code.applyPatch for edits.",
        parameters: {
          type: "object",
          properties: { path: { type: "string" }, content: { type: "string" } },
          required: ["path", "content"],
        },
      },
      execute: async (args) => {
        const fullPath = resolve(deps.rootDir, String(args.path));
        writeFileSync(fullPath, String(args.content), "utf8");
        return { written: fullPath, bytes: Buffer.byteLength(String(args.content), "utf8") };
      },
    },
    {
      definition: {
        name: "code.readFile",
        description: "Read a full UTF-8 file from the repo root.",
        parameters: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
      execute: async (args) => {
        const fullPath = resolve(deps.rootDir, String(args.path));
        return { path: fullPath, content: readFileSync(fullPath, "utf8") };
      },
    },
  ];
}
