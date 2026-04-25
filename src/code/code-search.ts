import { spawn } from "node:child_process";
import { logger } from "../logs/logger";

export interface CodeMatch {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface SearchOptions {
  /** Restrict to files matching glob (rg --glob). */
  glob?: string;
  /** Limit results. */
  limit?: number;
  /** Case-insensitive (rg -i). */
  caseInsensitive?: boolean;
  /** Search content of these explicit paths only. */
  paths?: string[];
}

/**
 * Repository-aware semantic-ish search backed by ripgrep. We expose
 * three primitives the agent reasons about:
 *   - `searchPattern`: free-text/regex search, the workhorse.
 *   - `findDefinition`: heuristic identifier-definition match for the
 *     common cases (function/class/const/let/let in JS/TS/Py/Go/Rust).
 *   - `findReferences`: identifier word-boundary match, all occurrences.
 *
 * For LSP-grade accuracy callers can layer the LSP client on top —
 * ripgrep is the always-available baseline so the agent never has to
 * fall back to grep+sed for repo-level reasoning.
 */
export class CodeSearch {
  constructor(private readonly cwd: string = process.cwd()) {}

  async searchPattern(pattern: string, options: SearchOptions = {}): Promise<CodeMatch[]> {
    const args = ["--json", "--no-heading", "--with-filename", "--line-number", "--column"];
    if (options.caseInsensitive) args.push("-i");
    if (options.glob) args.push("--glob", options.glob);
    args.push("--max-count", String(options.limit ?? 200));
    args.push(pattern);
    if (options.paths?.length) args.push(...options.paths);
    return this.runRipgrep(args);
  }

  async findDefinition(identifier: string, language?: string): Promise<CodeMatch[]> {
    const patterns = buildDefinitionPatterns(identifier, language);
    const results: CodeMatch[] = [];
    for (const pattern of patterns) {
      const matches = await this.searchPattern(pattern, {
        glob: language ? globForLanguage(language) : undefined,
        limit: 50,
      });
      results.push(...matches);
    }
    return dedupe(results);
  }

  async findReferences(identifier: string, language?: string): Promise<CodeMatch[]> {
    const escaped = escapeRegex(identifier);
    return this.searchPattern(`\\b${escaped}\\b`, {
      glob: language ? globForLanguage(language) : undefined,
      limit: 1000,
    });
  }

  async outline(filePath: string): Promise<CodeMatch[]> {
    const language = languageFromExt(filePath);
    const patterns = outlinePatterns(language);
    const matches: CodeMatch[] = [];
    for (const pattern of patterns) {
      const found = await this.searchPattern(pattern, { paths: [filePath], limit: 500 });
      matches.push(...found);
    }
    return matches.sort((a, b) => a.line - b.line);
  }

  private async runRipgrep(args: string[]): Promise<CodeMatch[]> {
    return new Promise((resolve) => {
      const child = spawn("rg", args, {
        cwd: this.cwd,
        stdio: ["ignore", "pipe", "pipe"], // ignore stdin so rg doesn't wait for input
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      child.on("error", (error) => {
        logger.warn("[code-search] ripgrep spawn failed", { error: error.message });
        resolve([]);
      });
      child.on("close", (code) => {
        // exit 1 = no matches, exit 0 = matches; both fine.
        if (code !== 0 && code !== 1) {
          logger.warn("[code-search] ripgrep exited with code", { code, stderr: stderr.slice(0, 200) });
        }
        resolve(parseRgJson(stdout));
      });
    });
  }
}

function parseRgJson(stdout: string): CodeMatch[] {
  if (!stdout) return [];
  const out: CodeMatch[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as RgEvent;
      if (event.type !== "match" || !event.data) continue;
      const m = event.data;
      const path = m.path?.text;
      const text = m.lines?.text?.replace(/\n+$/, "");
      const lineNo = m.line_number;
      const col = m.submatches?.[0]?.start ?? 0;
      if (!path || text === undefined || lineNo === undefined) continue;
      out.push({ path, line: lineNo, column: col + 1, text });
    } catch {
      // ignore non-json lines
    }
  }
  return out;
}

interface RgEvent {
  type: string;
  data?: {
    path?: { text?: string };
    lines?: { text?: string };
    line_number?: number;
    submatches?: Array<{ start?: number }>;
  };
}

function buildDefinitionPatterns(identifier: string, language?: string): string[] {
  const id = escapeRegex(identifier);
  const lang = (language ?? "").toLowerCase();
  const tsJs = [
    `(?:export\\s+)?(?:async\\s+)?function\\s+${id}\\b`,
    `(?:export\\s+)?(?:abstract\\s+)?class\\s+${id}\\b`,
    `(?:export\\s+)?(?:const|let|var)\\s+${id}\\b`,
    `(?:export\\s+)?interface\\s+${id}\\b`,
    `(?:export\\s+)?type\\s+${id}\\b`,
  ];
  const py = [
    `^\\s*def\\s+${id}\\b`,
    `^\\s*async\\s+def\\s+${id}\\b`,
    `^\\s*class\\s+${id}\\b`,
    `^\\s*${id}\\s*=`,
  ];
  const go = [`func\\s+(\\([^)]*\\)\\s+)?${id}\\b`, `type\\s+${id}\\s+`];
  const rust = [`fn\\s+${id}\\b`, `struct\\s+${id}\\b`, `enum\\s+${id}\\b`, `trait\\s+${id}\\b`];
  if (lang.startsWith("ts") || lang.startsWith("js")) return tsJs;
  if (lang === "python" || lang === "py") return py;
  if (lang === "go") return go;
  if (lang === "rust" || lang === "rs") return rust;
  return [...tsJs, ...py, ...go, ...rust];
}

function outlinePatterns(language: string): string[] {
  switch (language) {
    case "typescript":
    case "javascript":
      return [
        "(?:^|\\s)(?:export\\s+)?(?:async\\s+)?function\\s+\\w+",
        "(?:^|\\s)(?:export\\s+)?(?:abstract\\s+)?class\\s+\\w+",
        "(?:^|\\s)(?:export\\s+)?interface\\s+\\w+",
        "(?:^|\\s)(?:export\\s+)?type\\s+\\w+",
      ];
    case "python":
      return ["^\\s*(?:async\\s+)?def\\s+\\w+", "^\\s*class\\s+\\w+"];
    case "go":
      return ["^func\\s+(?:\\([^)]*\\)\\s+)?\\w+", "^type\\s+\\w+"];
    case "rust":
      return ["^\\s*fn\\s+\\w+", "^\\s*(?:pub\\s+)?struct\\s+\\w+", "^\\s*(?:pub\\s+)?enum\\s+\\w+"];
    default:
      return ["^.{0,80}"];
  }
}

function languageFromExt(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs"))
    return "javascript";
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".go")) return "go";
  if (lower.endsWith(".rs")) return "rust";
  if (lower.endsWith(".java")) return "java";
  if (lower.endsWith(".rb")) return "ruby";
  return "text";
}

function globForLanguage(language: string): string {
  const lang = language.toLowerCase();
  if (lang === "typescript") return "**/*.{ts,tsx}";
  if (lang === "javascript") return "**/*.{js,jsx,mjs,cjs}";
  if (lang === "python" || lang === "py") return "**/*.py";
  if (lang === "go") return "**/*.go";
  if (lang === "rust" || lang === "rs") return "**/*.rs";
  return "**/*";
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupe(matches: CodeMatch[]): CodeMatch[] {
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = `${m.path}:${m.line}:${m.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
