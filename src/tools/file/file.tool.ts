import { constants } from "node:fs";
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fail, ok, type ToolResult } from "../../common/result";

export interface FileToolOptions {
  rootDir: string;
}

export class FileTool {
  private readonly rootDir: string;

  constructor(options: FileToolOptions) {
    this.rootDir = resolve(options.rootDir);
  }

  async read(path: string): Promise<ToolResult<{ path: string; content: string }>> {
    const safe = this.safePath(path);
    if (!safe.success) return safe;
    try {
      const content = await readFile(safe.data.path, "utf8");
      return ok({ path: safe.data.path, content });
    } catch (error) {
      return fail("FILE_READ_FAILED", errorMessage(error), { recoverable: true });
    }
  }

  async write(path: string, content: string, options: { confirmed?: boolean } = {}): Promise<ToolResult<{ path: string }>> {
    const safe = this.safePath(path);
    if (!safe.success) return safe;
    const exists = await pathExists(safe.data.path);
    if (exists && !options.confirmed) {
      return fail("CONFIRMATION_REQUIRED", `Overwriting '${path}' requires confirmation`, {
        recoverable: true,
      });
    }
    try {
      await mkdir(dirname(safe.data.path), { recursive: true });
      await writeFile(safe.data.path, content, "utf8");
      return ok({ path: safe.data.path }, { overwritten: exists });
    } catch (error) {
      return fail("FILE_WRITE_FAILED", errorMessage(error), { recoverable: true });
    }
  }

  async list(path = "."): Promise<ToolResult<{ path: string; entries: string[] }>> {
    const safe = this.safePath(path);
    if (!safe.success) return safe;
    try {
      const entries = await readdir(safe.data.path);
      return ok({ path: safe.data.path, entries });
    } catch (error) {
      return fail("FILE_LIST_FAILED", errorMessage(error), { recoverable: true });
    }
  }

  async delete(path: string, options: { confirmed?: boolean } = {}): Promise<ToolResult<{ path: string }>> {
    const safe = this.safePath(path);
    if (!safe.success) return safe;
    if (!options.confirmed) {
      return fail("CONFIRMATION_REQUIRED", `Deleting '${path}' requires confirmation`, { recoverable: true });
    }
    try {
      await rm(safe.data.path, { recursive: true, force: true });
      return ok({ path: safe.data.path });
    } catch (error) {
      return fail("FILE_DELETE_FAILED", errorMessage(error), { recoverable: true });
    }
  }

  async editReplace(path: string, search: string, replacement: string): Promise<ToolResult<{ path: string; changed: boolean }>> {
    const current = await this.read(path);
    if (!current.success) return current;
    if (!current.data.content.includes(search)) {
      return ok({ path: current.data.path, changed: false });
    }
    const next = current.data.content.replace(search, replacement);
    const written = await this.write(path, next, { confirmed: true });
    if (!written.success) return written;
    return ok({ path: written.data.path, changed: true });
  }

  private safePath(path: string): ToolResult<{ path: string }> {
    const resolved = resolve(this.rootDir, path);
    const rootPrefix = this.rootDir.endsWith(sep) ? this.rootDir : `${this.rootDir}${sep}`;
    if (resolved !== this.rootDir && !resolved.startsWith(rootPrefix)) {
      return fail("PATH_OUTSIDE_ROOT", `Path '${path}' resolves outside workspace root`, { recoverable: false });
    }
    return ok({ path: resolved });
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
