import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline";
import { color } from "./tui";

export type ChoiceKey = "left" | "right" | "up" | "down";

export interface ChoiceState<T extends string = string> {
  choices: T[];
  index: number;
}

export interface SetupField<T extends string = string> {
  label: string;
  choices: T[];
  value: T;
  help?: string;
  group?: string;
}

export function applyChoiceKey<T extends string>(state: ChoiceState<T>, key: ChoiceKey): ChoiceState<T> {
  if (state.choices.length === 0) return state;
  if (key === "right" || key === "down") {
    return { ...state, index: (state.index + 1) % state.choices.length };
  }
  return { ...state, index: (state.index - 1 + state.choices.length) % state.choices.length };
}

export interface KeyboardWizardOptions {
  enabled?: boolean;
  /** When true, throws on Esc/q so the caller can react. Default false (non-saving cancel). */
  throwOnCancel?: boolean;
}

export async function runKeyboardWizard<T extends SetupField[]>(
  title: string,
  fields: T,
  options: KeyboardWizardOptions = {},
): Promise<T> {
  if (options.enabled === false || !input.isTTY || !output.isTTY) return fields;

  // Snapshot original values to support cancel-without-saving.
  const originals: Record<string, string> = {};
  for (const field of fields) originals[field.label] = field.value;

  readline.emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  input.setRawMode(true);
  let active = 0;
  let saved = false;

  const render = () => {
    output.write("\x1b[2J\x1b[H");
    output.write(`${color.brightCyan("◆")} ${color.bold(title)}\n`);
    output.write(
      color.dim("↑/↓ pilih baris   ←/→ ubah nilai   Enter simpan   q batal\n\n"),
    );
    let lastGroup: string | undefined;
    fields.forEach((field, index) => {
      if (field.group && field.group !== lastGroup) {
        output.write(`${color.brightMagenta("╺╸ " + field.group.toUpperCase())}\n`);
        lastGroup = field.group;
      }
      const selected = index === active;
      const prefix = selected ? color.brightCyan("▌") : color.dim("│");
      const labelText = (field.label + " ").padEnd(24, ".");
      const valueText = selected ? color.bold(color.brightYellow(field.value)) : color.bold(field.value);
      const choices = field.choices.length > 1 ? color.dim(`  [${field.choices.join(" / ")}]`) : "";
      output.write(`${prefix} ${selected ? color.brightCyan(labelText) : labelText}${valueText}${selected ? choices : ""}\n`);
      if (selected && field.help) output.write(`  ${color.dim(field.help)}\n`);
    });
    output.write("\n");
  };

  render();

  await new Promise<void>((resolve, reject) => {
    const onKey = (_chunk: string, key: readline.Key) => {
      if (key.name === "c" && key.ctrl) {
        cleanup();
        reject(new Error("Setup dibatalkan"));
        return;
      }
      if (key.name === "q" || key.name === "escape") {
        cleanup();
        // Restore originals on cancel.
        for (const field of fields) field.value = originals[field.label] as typeof field.value;
        if (options.throwOnCancel) reject(new Error("Setup dibatalkan"));
        else resolve();
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        saved = true;
        cleanup();
        resolve();
        return;
      }
      if (key.name === "up") active = Math.max(0, active - 1);
      if (key.name === "down") active = Math.min(fields.length - 1, active + 1);
      if (key.name === "left" || key.name === "right") {
        const field = fields[active]!;
        const current = Math.max(0, field.choices.indexOf(field.value));
        const next = applyChoiceKey({ choices: field.choices, index: current }, key.name as ChoiceKey);
        field.value = field.choices[next.index]!;
      }
      render();
    };

    const cleanup = () => {
      input.off("keypress", onKey);
      input.setRawMode(wasRaw);
      output.write("\n");
    };

    input.on("keypress", onKey);
  });

  return saved
    ? fields
    : (fields.map((field) => ({ ...field, value: originals[field.label] as string })) as unknown as T);
}

export interface ConfirmOptions {
  default?: boolean;
}

export async function confirm(question: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (!input.isTTY || !output.isTTY) return options.default ?? false;
  output.write(`${color.brightCyan("?")} ${question} ${color.dim(options.default ? "[Y/n] " : "[y/N] ")}`);
  readline.emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  input.setRawMode(true);
  return new Promise((resolve, reject) => {
    const onKey = (_chunk: string, key: readline.Key) => {
      if (key.name === "c" && key.ctrl) {
        cleanup();
        reject(new Error("aborted"));
        return;
      }
      if (key.name === "y") {
        cleanup();
        output.write(color.green("yes\n"));
        resolve(true);
        return;
      }
      if (key.name === "n") {
        cleanup();
        output.write(color.red("no\n"));
        resolve(false);
        return;
      }
      if (key.name === "return") {
        cleanup();
        const def = options.default ?? false;
        output.write(def ? color.green("yes\n") : color.red("no\n"));
        resolve(def);
        return;
      }
    };
    const cleanup = () => {
      input.off("keypress", onKey);
      input.setRawMode(wasRaw);
    };
    input.on("keypress", onKey);
  });
}

export async function pickOne(question: string, choices: string[], defaultIndex = 0): Promise<string> {
  if (!input.isTTY || !output.isTTY) return choices[defaultIndex] ?? choices[0]!;
  let active = Math.min(Math.max(defaultIndex, 0), choices.length - 1);
  readline.emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  input.setRawMode(true);
  const render = () => {
    output.write("\x1b[2K\r");
    output.write(`${color.brightCyan("?")} ${color.bold(question)}  `);
    output.write(
      choices
        .map((choice, i) => (i === active ? color.brightYellow(`[${choice}]`) : color.dim(` ${choice} `)))
        .join("  "),
    );
    output.write("  " + color.dim("(←/→ pilih, Enter konfirmasi)"));
  };
  render();
  return new Promise((resolve, reject) => {
    const onKey = (_chunk: string, key: readline.Key) => {
      if (key.name === "c" && key.ctrl) {
        cleanup();
        reject(new Error("aborted"));
        return;
      }
      if (key.name === "left") active = (active - 1 + choices.length) % choices.length;
      if (key.name === "right") active = (active + 1) % choices.length;
      if (key.name === "return") {
        cleanup();
        output.write("\n");
        resolve(choices[active]!);
        return;
      }
      render();
    };
    const cleanup = () => {
      input.off("keypress", onKey);
      input.setRawMode(wasRaw);
    };
    input.on("keypress", onKey);
  });
}
