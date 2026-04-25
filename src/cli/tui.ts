export const color = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
};

export function status(value: boolean, readyText = "ready", missingText = "missing"): string {
  return value ? color.green(readyText) : color.red(missingText);
}

export function table(rows: Array<[string, string]>): string {
  const width = Math.max(...rows.map(([left]) => left.length), 8);
  return rows.map(([left, right]) => `${left.padEnd(width)}  ${right}`).join("\n");
}

export async function spinner<T>(label: string, task: () => Promise<T>): Promise<T> {
  process.stdout.write(`${color.cyan("...")} ${label}\n`);
  return task();
}
