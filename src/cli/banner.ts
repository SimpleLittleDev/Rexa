export function banner(version = "0.1.0"): string {
  return [
    " ____                 ",
    "|  _ \\ _____  ____ _ ",
    "| |_) / _ \\ \\/ / _` |",
    "|  _ <  __/>  < (_| |",
    "|_| \\_\\___/_/\\_\\__,_|",
    "",
    `Personal Autonomous AI Assistant v${version}`,
  ].join("\n");
}
