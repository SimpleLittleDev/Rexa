import { resolve } from "node:path";

export class PathSandbox {
  constructor(private readonly rootDir: string) {}

  assertInside(path: string): string {
    const resolvedRoot = resolve(this.rootDir);
    const resolvedPath = resolve(resolvedRoot, path);
    if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}/`)) {
      throw new Error(`Path '${path}' is outside sandbox root '${resolvedRoot}'`);
    }
    return resolvedPath;
  }
}
