export interface TextPatch {
  path: string;
  search: string;
  replacement: string;
}

export interface PatchPreview {
  path: string;
  changed: boolean;
  beforeSnippet: string;
  afterSnippet: string;
}

export class FilePatcher {
  preview(content: string, patch: TextPatch): PatchPreview {
    const index = content.indexOf(patch.search);
    if (index === -1) {
      return { path: patch.path, changed: false, beforeSnippet: "", afterSnippet: "" };
    }
    const beforeSnippet = content.slice(Math.max(0, index - 80), index + patch.search.length + 80);
    const after = content.replace(patch.search, patch.replacement);
    const afterSnippet = after.slice(Math.max(0, index - 80), index + patch.replacement.length + 80);
    return { path: patch.path, changed: true, beforeSnippet, afterSnippet };
  }

  apply(content: string, patch: TextPatch): string {
    if (!content.includes(patch.search)) {
      throw new Error(`Patch search text not found in ${patch.path}`);
    }
    return content.replace(patch.search, patch.replacement);
  }
}
