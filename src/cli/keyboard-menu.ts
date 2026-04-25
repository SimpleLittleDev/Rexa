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
}

export function applyChoiceKey<T extends string>(state: ChoiceState<T>, key: ChoiceKey): ChoiceState<T> {
  if (state.choices.length === 0) return state;
  if (key === "right" || key === "down") {
    return { ...state, index: (state.index + 1) % state.choices.length };
  }
  return { ...state, index: (state.index - 1 + state.choices.length) % state.choices.length };
}

export async function runKeyboardWizard<T extends SetupField[]>(
  title: string,
  fields: T,
  options: { enabled?: boolean } = {},
): Promise<T> {
  if (options.enabled === false || !input.isTTY || !output.isTTY) return fields;

  readline.emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  input.setRawMode(true);
  let active = 0;
  let done = false;

  const render = () => {
    output.write("\x1b[2J\x1b[H");
    output.write(`${color.cyan(title)}\n`);
    output.write(color.dim("Up/Down pilih baris, Left/Right ubah nilai, Enter simpan, q batal.\n\n"));
    fields.forEach((field, index) => {
      const selected = index === active;
      const prefix = selected ? color.green(">") : " ";
      const value = color.bold(field.value);
      output.write(`${prefix} ${field.label.padEnd(22)} ${value}\n`);
      if (selected && field.help) output.write(`  ${color.dim(field.help)}\n`);
    });
  };

  render();

  await new Promise<void>((resolve, reject) => {
    const onKey = (_chunk: string, key: readline.Key) => {
      if (key.name === "c" && key.ctrl) {
        cleanup();
        reject(new Error("Setup cancelled"));
        return;
      }
      if (key.name === "q" || key.name === "escape") {
        cleanup();
        resolve();
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        done = true;
        cleanup();
        resolve();
        return;
      }
      if (key.name === "up") active = Math.max(0, active - 1);
      if (key.name === "down") active = Math.min(fields.length - 1, active + 1);
      if (key.name === "left" || key.name === "right") {
        const field = fields[active]!;
        const current = Math.max(0, field.choices.indexOf(field.value));
        const next = applyChoiceKey({ choices: field.choices, index: current }, key.name);
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

  return done ? fields : fields;
}
