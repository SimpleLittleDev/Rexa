const secretPatterns: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(authorization:\s*bearer\s+)[^\s]+/gi, replacement: "$1[REDACTED]" },
  { pattern: /(api[_-]?key["']?\s*[:=]\s*["']?)[A-Za-z0-9_\-.$]+/gi, replacement: "$1[REDACTED]" },
  { pattern: /(token["']?\s*[:=]\s*["']?)[A-Za-z0-9_\-.$]+/gi, replacement: "$1[REDACTED]" },
  { pattern: /(password["']?\s*[:=]\s*["']?)[^"',\s]+/gi, replacement: "$1[REDACTED]" },
  { pattern: /(cookie:\s*)[^\n]+/gi, replacement: "$1[REDACTED]" },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/g, replacement: "[REDACTED_PRIVATE_KEY]" },
];

export class Redactor {
  redact(value: unknown): unknown {
    if (typeof value === "string") return this.redactString(value);
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
          key,
          isSensitiveKey(key) ? "[REDACTED]" : this.redact(entry),
        ]),
      );
    }
    return value;
  }

  redactString(input: string): string {
    return secretPatterns.reduce((text, entry) => text.replace(entry.pattern, entry.replacement), input);
  }
}

function isSensitiveKey(key: string): boolean {
  return /(password|token|secret|cookie|authorization|apiKey|api_key|refresh)/i.test(key);
}
