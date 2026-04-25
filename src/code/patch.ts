import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface PatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[]; // each prefixed with ' ' | '+' | '-'
}

export interface PatchFile {
  path: string;
  oldPath?: string;
  hunks: PatchHunk[];
}

export interface PatchValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parse a unified-diff string into a typed structure. Tolerates the
 * `git diff` and `diff -u` headers; ignores binary-file markers.
 */
export function parseUnifiedDiff(diff: string): PatchFile[] {
  const files: PatchFile[] = [];
  const lines = diff.split("\n");
  let current: PatchFile | null = null;
  let currentHunk: PatchHunk | null = null;
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (current) files.push(current);
      current = { path: "", hunks: [] };
      currentHunk = null;
      continue;
    }
    if (line.startsWith("--- ")) {
      const path = line.slice(4).trim();
      if (current) current.oldPath = path.replace(/^a\//, "");
      continue;
    }
    if (line.startsWith("+++ ")) {
      const path = line.slice(4).trim();
      if (!current) {
        current = { path: "", hunks: [] };
      }
      current.path = path.replace(/^b\//, "");
      continue;
    }
    if (line.startsWith("@@")) {
      const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (!m || !current) continue;
      currentHunk = {
        oldStart: parseInt(m[1], 10),
        oldLines: m[2] ? parseInt(m[2], 10) : 1,
        newStart: parseInt(m[3], 10),
        newLines: m[4] ? parseInt(m[4], 10) : 1,
        lines: [],
      };
      current.hunks.push(currentHunk);
      continue;
    }
    if (currentHunk && (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-"))) {
      currentHunk.lines.push(line);
    }
  }
  if (current) files.push(current);
  return files;
}

/**
 * Validate a unified diff against the working tree:
 *   - All `path` entries must be relative (no .. escapes).
 *   - Each hunk must be syntactically well-formed (line counts match).
 *   - `git apply --check` must report success.
 *
 * Returns a structured result rather than throwing so callers can
 * surface the errors to the model in a tool response.
 */
export async function validatePatch(diff: string, repoRoot: string): Promise<PatchValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = parseUnifiedDiff(diff);
  if (files.length === 0) {
    return { ok: false, errors: ["empty patch"], warnings: [] };
  }
  for (const file of files) {
    if (!file.path) {
      errors.push("file entry missing path");
      continue;
    }
    if (file.path.includes("..")) {
      errors.push(`path '${file.path}' contains '..'`);
    }
    if (file.path.startsWith("/")) {
      errors.push(`path '${file.path}' is absolute`);
    }
    for (const hunk of file.hunks) {
      const counts = countHunkLines(hunk);
      if (counts.removed !== hunk.oldLines) {
        warnings.push(
          `hunk @@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@ in ${file.path} expected ${hunk.oldLines} old lines but found ${counts.removed}`,
        );
      }
      if (counts.added !== hunk.newLines) {
        warnings.push(
          `hunk @@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@ in ${file.path} expected ${hunk.newLines} new lines but found ${counts.added}`,
        );
      }
    }
  }
  // Final dry-run via git apply --check.
  const tmp = mkdtempSync(join(tmpdir(), "rexa-patch-"));
  const patchPath = join(tmp, "patch.diff");
  writeFileSync(patchPath, diff.endsWith("\n") ? diff : diff + "\n", "utf8");
  try {
    await execFileAsync("git", ["apply", "--check", "--whitespace=nowarn", patchPath], {
      cwd: repoRoot,
    });
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    errors.push(`git apply --check failed: ${(err.stderr || err.message || "unknown error").trim().slice(0, 1000)}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Apply a previously-validated patch via `git apply`. Caller is
 * responsible for calling `validatePatch` first if they want pre-flight
 * verification.
 */
export async function applyPatch(diff: string, repoRoot: string): Promise<void> {
  const tmp = mkdtempSync(join(tmpdir(), "rexa-patch-"));
  const patchPath = join(tmp, "patch.diff");
  writeFileSync(patchPath, diff.endsWith("\n") ? diff : diff + "\n", "utf8");
  await execFileAsync("git", ["apply", "--whitespace=nowarn", patchPath], { cwd: repoRoot });
}

/**
 * Read a file slice (1-based line range, inclusive) from disk. Used by
 * code-edit tools to show the model what they're about to patch.
 */
export function readFileSlice(filePath: string, startLine = 1, endLine = Infinity): string {
  if (!existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  const lines = readFileSync(filePath, "utf8").split("\n");
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine === Infinity ? lines.length : endLine);
  return lines.slice(start, end).join("\n");
}

function countHunkLines(hunk: PatchHunk): { added: number; removed: number; context: number } {
  let added = 0;
  let removed = 0;
  let context = 0;
  for (const line of hunk.lines) {
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
    else context += 1;
  }
  return {
    added: added + context,
    removed: removed + context,
    context,
  };
}
