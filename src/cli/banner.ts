import { color, gradient } from "./tui";

const ASCII = [
  "  ____                    ",
  " |  _ \\  ___ __  __  ___ ",
  " | |_) |/ _ \\\\ \\/ / / _ \\",
  " |  _ <|  __/ >  < |  __/",
  " |_| \\_\\\\___|/_/\\_\\ \\___|",
];

export function banner(version = "0.2.0"): string {
  const ascii = gradient(ASCII.join("\n"));
  const tag = color.dim("Personal Autonomous AI Assistant");
  const meta = `${color.brightCyan("◆")} ${color.bold("Rexa")} ${color.dim("v" + version)}   ${color.dim("•")}   ${tag}`;
  return [ascii, "", meta].join("\n");
}

export function compactBanner(version = "0.2.0"): string {
  return `${color.brightMagenta("◆")} ${color.bold("Rexa")} ${color.dim("v" + version)} ${color.dim("— ")}${color.brightCyan("autonomous AI assistant")}`;
}
