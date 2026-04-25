import { stdout as output } from "node:process";

const ESC = "\x1b[";

export const supportsColor = (() => {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(output.isTTY);
})();

function wrap(open: string, close: string) {
  return (text: string) => (supportsColor ? `${ESC}${open}${text}${ESC}${close}` : text);
}

export const color = {
  reset: (text: string) => (supportsColor ? `${ESC}0m${text}${ESC}0m` : text),
  bold: wrap("1m", "22m"),
  dim: wrap("2m", "22m"),
  italic: wrap("3m", "23m"),
  underline: wrap("4m", "24m"),
  inverse: wrap("7m", "27m"),
  black: wrap("30m", "39m"),
  red: wrap("31m", "39m"),
  green: wrap("32m", "39m"),
  yellow: wrap("33m", "39m"),
  blue: wrap("34m", "39m"),
  magenta: wrap("35m", "39m"),
  cyan: wrap("36m", "39m"),
  white: wrap("37m", "39m"),
  gray: wrap("90m", "39m"),
  brightCyan: wrap("96m", "39m"),
  brightMagenta: wrap("95m", "39m"),
  brightBlue: wrap("94m", "39m"),
  brightGreen: wrap("92m", "39m"),
  brightYellow: wrap("93m", "39m"),
  brightRed: wrap("91m", "39m"),
  bgCyan: wrap("46m", "49m"),
  bgBlue: wrap("44m", "49m"),
  bgMagenta: wrap("45m", "49m"),
  bgGreen: wrap("42m", "49m"),
  bgRed: wrap("41m", "49m"),
};

export function strip(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

export function visibleLength(text: string): number {
  return [...strip(text)].length;
}

export function pad(text: string, width: number, align: "left" | "right" | "center" = "left"): string {
  const len = visibleLength(text);
  if (len >= width) return text;
  const diff = width - len;
  if (align === "right") return " ".repeat(diff) + text;
  if (align === "center") {
    const left = Math.floor(diff / 2);
    const right = diff - left;
    return " ".repeat(left) + text + " ".repeat(right);
  }
  return text + " ".repeat(diff);
}

export function status(value: boolean, readyText = "ready", missingText = "missing"): string {
  return value ? color.green(`● ${readyText}`) : color.red(`○ ${missingText}`);
}

export function badge(label: string, kind: "ok" | "warn" | "err" | "info" = "info"): string {
  const colorize =
    kind === "ok" ? color.bgGreen : kind === "warn" ? color.bgMagenta : kind === "err" ? color.bgRed : color.bgBlue;
  return colorize(color.black(` ${label} `));
}

export function bullet(kind: "ok" | "warn" | "err" | "info" | "step" = "info"): string {
  if (kind === "ok") return color.green("✔");
  if (kind === "warn") return color.yellow("!");
  if (kind === "err") return color.red("✖");
  if (kind === "step") return color.cyan("›");
  return color.brightBlue("•");
}

const BOX = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
  cross: "┼",
  teeRight: "├",
  teeLeft: "┤",
};

export interface BoxOptions {
  title?: string;
  width?: number;
  padding?: number;
  borderColor?: (text: string) => string;
}

export function box(content: string, options: BoxOptions = {}): string {
  const padding = options.padding ?? 1;
  const lines = content.split("\n");
  const innerWidth = Math.max(...lines.map(visibleLength), options.title ? visibleLength(options.title) + 4 : 0);
  const width = options.width ?? innerWidth + padding * 2;
  const border = options.borderColor ?? color.brightCyan;
  const top = options.title
    ? border(BOX.topLeft + BOX.horizontal + " " + color.bold(options.title) + " " + BOX.horizontal.repeat(Math.max(0, width - visibleLength(options.title) - 4)) + BOX.topRight)
    : border(BOX.topLeft + BOX.horizontal.repeat(width) + BOX.topRight);
  const bottom = border(BOX.bottomLeft + BOX.horizontal.repeat(width) + BOX.bottomRight);
  const padX = " ".repeat(padding);
  const middle = lines
    .map((line) => border(BOX.vertical) + padX + pad(line, width - padding * 2) + padX + border(BOX.vertical))
    .join("\n");
  return [top, middle, bottom].join("\n");
}

export function header(title: string, subtitle?: string): string {
  const main = `${color.brightCyan("▎")} ${color.bold(color.brightCyan(title))}`;
  const sub = subtitle ? `\n  ${color.dim(subtitle)}` : "";
  return main + sub;
}

export function section(title: string): string {
  return `\n${color.brightMagenta("╺╸")} ${color.bold(color.brightMagenta(title.toUpperCase()))} ${color.brightMagenta("╺".repeat(Math.max(2, 60 - visibleLength(title))))}`;
}

export interface TableOptions {
  align?: Array<"left" | "right" | "center">;
  headerStyle?: (text: string) => string;
}

export function table(rows: Array<[string, string]> | Array<string[]>, options: TableOptions = {}): string {
  if (rows.length === 0) return "";
  const matrix = rows.map((row) => (Array.isArray(row) ? row : [row[0], row[1]]));
  const widths = matrix[0]!.map((_, i) => Math.max(...matrix.map((row) => visibleLength(row[i] ?? ""))));
  return matrix
    .map((row) =>
      row
        .map((cell, i) => pad(cell ?? "", widths[i]!, options.align?.[i] ?? "left"))
        .join("  "),
    )
    .join("\n");
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface SpinnerHandle {
  succeed(message?: string): void;
  fail(message?: string): void;
  warn(message?: string): void;
  info(message?: string): void;
  update(message: string): void;
  stop(): void;
}

export function startSpinner(label: string): SpinnerHandle {
  if (!output.isTTY) {
    output.write(`${color.cyan("…")} ${label}\n`);
    return {
      succeed: (m) => output.write(`${color.green("✔")} ${m ?? label}\n`),
      fail: (m) => output.write(`${color.red("✖")} ${m ?? label}\n`),
      warn: (m) => output.write(`${color.yellow("!")} ${m ?? label}\n`),
      info: (m) => output.write(`${color.brightBlue("ℹ")} ${m ?? label}\n`),
      update: () => undefined,
      stop: () => undefined,
    };
  }
  let frame = 0;
  let current = label;
  output.write("\x1b[?25l");
  const render = () => {
    output.write(`\r${color.cyan(SPINNER_FRAMES[frame % SPINNER_FRAMES.length]!)} ${current}\x1b[K`);
    frame += 1;
  };
  const timer = setInterval(render, 80);
  render();
  const finalize = (icon: string, message?: string) => {
    clearInterval(timer);
    output.write(`\r${icon} ${message ?? current}\x1b[K\n`);
    output.write("\x1b[?25h");
  };
  return {
    succeed: (message) => finalize(color.green("✔"), message),
    fail: (message) => finalize(color.red("✖"), message),
    warn: (message) => finalize(color.yellow("!"), message),
    info: (message) => finalize(color.brightBlue("ℹ"), message),
    update: (message) => {
      current = message;
    },
    stop: () => {
      clearInterval(timer);
      output.write("\r\x1b[K");
      output.write("\x1b[?25h");
    },
  };
}

export async function spinner<T>(label: string, task: () => Promise<T> | T): Promise<T> {
  const handle = startSpinner(label);
  try {
    const result = await task();
    handle.succeed(`${label} ${color.dim("done")}`);
    return result;
  } catch (error) {
    handle.fail(`${label} ${color.dim("failed")} ${color.red(error instanceof Error ? error.message : String(error))}`);
    throw error;
  }
}

export interface ProgressBarHandle {
  tick(amount?: number, label?: string): void;
  done(label?: string): void;
}

export function progressBar(total: number, label = "Progress"): ProgressBarHandle {
  if (!output.isTTY) {
    output.write(`${color.cyan("…")} ${label}\n`);
    return {
      tick: () => undefined,
      done: (text) => output.write(`${color.green("✔")} ${text ?? label}\n`),
    };
  }
  let current = 0;
  output.write("\x1b[?25l");
  const render = (text = label) => {
    const ratio = total > 0 ? Math.min(1, current / total) : 0;
    const width = 28;
    const filled = Math.round(width * ratio);
    const bar =
      color.brightCyan("█".repeat(filled)) + color.dim("░".repeat(width - filled));
    const pct = `${Math.round(ratio * 100)}`.padStart(3, " ");
    output.write(`\r${bar} ${color.bold(pct + "%")} ${color.dim(text)}\x1b[K`);
  };
  render();
  return {
    tick: (amount = 1, text) => {
      current = Math.min(total, current + amount);
      render(text ?? label);
    },
    done: (text) => {
      current = total;
      render(text ?? label);
      output.write("\n\x1b[?25h");
    },
  };
}

export function gradient(text: string, palette: Array<(text: string) => string> = [color.brightMagenta, color.brightBlue, color.brightCyan, color.brightGreen]): string {
  return text
    .split("\n")
    .map((line, lineIndex) =>
      [...line]
        .map((ch, i) => {
          if (ch === " ") return ch;
          const p = palette[(i + lineIndex) % palette.length]!;
          return p(ch);
        })
        .join(""),
    )
    .join("\n");
}

export function divider(width = 60): string {
  return color.dim("─".repeat(width));
}

export function indent(text: string, n = 2): string {
  const pad = " ".repeat(n);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}
