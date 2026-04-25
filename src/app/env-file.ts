import { chmod, readFile, writeFile } from "node:fs/promises";

export function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    env[key] = unquoteEnvValue(value);
  }
  return env;
}

export async function loadEnvFile(path = ".env"): Promise<Record<string, string>> {
  let content = "";
  try {
    content = await readFile(path, "utf8");
  } catch {
    return {};
  }
  const parsed = parseEnvFile(content);
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] ??= value;
  }
  return parsed;
}

export function setEnvValue(content: string, key: string, value: string): string {
  const escaped = `${key}=${quoteEnvValue(value)}`;
  const lines = content.replace(/\s*$/u, "").split(/\r?\n/).filter((line) => line.length > 0);
  let replaced = false;
  const next = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      replaced = true;
      return escaped;
    }
    return line;
  });
  if (!replaced) next.push(escaped);
  return `${next.join("\n")}\n`;
}

export async function writeEnvValue(path: string, key: string, value: string): Promise<void> {
  let content = "";
  try {
    content = await readFile(path, "utf8");
  } catch {
    content = "";
  }
  await writeFile(path, setEnvValue(content, key, value), "utf8");
  await chmod(path, 0o600);
}

function quoteEnvValue(value: string): string {
  if (/^[A-Za-z0-9_./:@-]*$/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function unquoteEnvValue(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return value;
}
