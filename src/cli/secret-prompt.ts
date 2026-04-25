import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline";

export async function promptSecret(label: string): Promise<string | null> {
  if (!input.isTTY || !output.isTTY) return null;

  readline.emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  input.setRawMode(true);
  let value = "";

  output.write(`${label}: `);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      input.off("keypress", onKey);
      input.setRawMode(wasRaw);
      output.write("\n");
    };

    const onKey = (chunk: string, key: readline.Key) => {
      if (key.name === "c" && key.ctrl) {
        cleanup();
        reject(new Error("Secret input cancelled"));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(value.trim() || null);
        return;
      }
      if (key.name === "backspace") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          output.write("\b \b");
        }
        return;
      }
      if (chunk && !key.ctrl && !key.meta && chunk >= " ") {
        value += chunk;
        output.write("*");
      }
    };

    input.on("keypress", onKey);
  });
}
