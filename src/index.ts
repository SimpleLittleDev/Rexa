#!/usr/bin/env node
import { join } from "node:path";
import { loadEnvFile } from "./app/env-file";
import { resolveRexaHome } from "./app/paths";
import { createRexaRuntime, ensureProjectDirs } from "./app/bootstrap";
import { startServer } from "./app/server";
import { attachAgentToChatProvider } from "./chat/chat-runner";
import { CLIChatProvider } from "./chat/cli.provider";
import { TelegramChatProvider } from "./chat/telegram.provider";
import { WebChatProvider } from "./chat/web.provider";
import { WebSocketChatProvider } from "./chat/websocket.provider";
import { WhatsAppChatProvider } from "./chat/whatsapp.provider";
import { SetupWizard } from "./cli/setup-wizard";
import { compactBanner } from "./cli/banner";
import { box, color, divider, header, indent, section, table } from "./cli/tui";
import { EnvironmentDetector } from "./env/detector";
import { CLIProviderDetector } from "./llm/cli-provider-detector";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "help";
  const home = resolveRexaHome();
  await ensureProjectDirs(home);
  // Load .env from both Rexa home and current working directory (cwd wins).
  await loadEnvFile(join(home, ".env"));
  if (process.cwd() !== home) {
    await loadEnvFile(join(process.cwd(), ".env"));
  }

  if (command === "setup") {
    await new SetupWizard().run();
    return;
  }

  if (command === "doctor") {
    await runDoctor();
    return;
  }

  if (command === "chat") {
    const runtime = await createRexaRuntime();
    console.log(compactBanner() + "  " + color.dim("CLI chat ready."));
    const chat = new CLIChatProvider();
    attachAgentToChatProvider(chat, runtime.agent);
    await chat.start();
    return;
  }

  if (command === "telegram") {
    const runtime = await createRexaRuntime();
    const telegram = new TelegramChatProvider();
    attachAgentToChatProvider(telegram, runtime.agent);
    await telegram.start();
    console.log(`${color.green("✔")} Rexa Telegram bot running.`);
    return;
  }

  if (command === "whatsapp") {
    const sub = process.argv[3];
    const whatsapp = new WhatsAppChatProvider();
    if (sub === "logout") {
      await whatsapp.logout();
      console.log(`${color.green("✔")} WhatsApp session cleared. Run 'rexa whatsapp' to scan a new QR.`);
      return;
    }
    if (sub === "status") {
      const s = whatsapp.status();
      console.log(table([
        [color.dim("paired"), s.paired ? color.green("yes") : color.yellow("no")],
        [color.dim("user"), s.user ?? color.dim("(unpaired)")],
        [color.dim("auth dir"), s.authDir],
      ]));
      return;
    }
    const runtime = await createRexaRuntime();
    attachAgentToChatProvider(whatsapp, runtime.agent);
    await whatsapp.start();
    console.log(`${color.green("✔")} WhatsApp running. Press Ctrl+C to stop.`);
    return;
  }

  if (command === "ws" || command === "websocket") {
    const runtime = await createRexaRuntime();
    const websocket = new WebSocketChatProvider();
    attachAgentToChatProvider(websocket, runtime.agent);
    await websocket.start();
    console.log(`${color.green("✔")} Rexa WebSocket listening on ws://127.0.0.1:${process.env.REXA_WS_PORT ?? 8788}`);
    return;
  }

  if (command === "web") {
    const runtime = await createRexaRuntime();
    const web = new WebChatProvider();
    attachAgentToChatProvider(web, runtime.agent);
    await web.start();
    console.log(`${color.green("✔")} Rexa web chat listening on http://127.0.0.1:${process.env.REXA_WEB_PORT ?? 8787}`);
    return;
  }

  if (command === "api") {
    const runtime = await createRexaRuntime();
    await startServer(runtime.agent);
    console.log(`${color.green("✔")} Rexa API listening on http://127.0.0.1:8786`);
    return;
  }

  if (command === "daemon") {
    await runDaemonCommand(process.argv.slice(3), home);
    return;
  }

  if (command === "watch") {
    await runWatchCommand(process.argv.slice(3), home);
    return;
  }

  if (command === "schedule") {
    await runScheduleCommand(process.argv.slice(3), home);
    return;
  }

  if (command === "task") {
    await runTaskCommand(process.argv.slice(3), home);
    return;
  }

  if (command === "cost") {
    await runCostCommand(process.argv.slice(3), home);
    return;
  }

  if (command === "update") {
    await runUpdateCommand(home);
    return;
  }

  if (command === "demo-flow" || command === "demo") {
    const runtime = await createRexaRuntime();
    const result = await runtime.agent.run(
      "Ambil data dari website, lanjut analisis struktur project, lalu spawn worker dinamis jika task terlalu besar.",
      {
        userId: "local",
        onProgress: (progress) => console.log(color.dim(progress)),
      },
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "help" || command === "-h" || command === "--help") {
    printHelp();
    return;
  }

  console.error(color.red(`Unknown command: ${command}\n`));
  printHelp();
  process.exitCode = 1;
}

async function runDoctor(): Promise<void> {
  const env = await new EnvironmentDetector().detect();
  const providers = await new CLIProviderDetector().detectAll();

  console.log(compactBanner() + " " + color.dim("doctor"));
  console.log();
  console.log(section("Environment"));
  console.log();
  console.log(
    table([
      [color.dim("Rexa home"), resolveRexaHome()],
      [color.dim("OS"), `${env.os} ${env.architecture}`],
      [color.dim("Node.js"), env.nodeVersion],
      [color.dim("npm"), env.npmVersion ?? color.red("missing")],
      [color.dim("Shell"), env.shell ?? "unknown"],
      [color.dim("Browser"), env.browser.recommendedMode],
      [color.dim("Playwright"), env.browser.playwrightPackage ? color.green("ready") : color.yellow("install playwright")],
      [color.dim("Chromium binary"), env.browser.chromium ? color.green("found") : color.yellow("not detected")],
      [color.dim("Google Chrome"), env.browser.googleChrome ? color.green("found") : color.dim("not detected")],
    ]),
  );
  console.log();
  console.log(section("CLI providers"));
  console.log();
  for (const provider of providers) {
    const state = provider.ready
      ? color.green("ready")
      : provider.installed
        ? color.yellow("needs auth")
        : color.red("missing");
    console.log(`  ${color.bold(provider.provider.padEnd(14))} ${state} ${color.dim(provider.version ?? "")}`);
  }
  console.log();
  console.log(section("API keys"));
  console.log();
  console.log(
    table([
      [color.dim("OPENAI_API_KEY"), process.env.OPENAI_API_KEY ? color.green("set") : color.yellow("not set")],
      [color.dim("ANTHROPIC_API_KEY"), process.env.ANTHROPIC_API_KEY ? color.green("set") : color.yellow("not set")],
      [color.dim("OPENROUTER_API_KEY"), process.env.OPENROUTER_API_KEY ? color.green("set") : color.dim("not set")],
      [color.dim("GEMINI_API_KEY"), process.env.GEMINI_API_KEY ? color.green("set") : color.dim("not set")],
    ]),
  );
  console.log();
}

function printHelp(): void {
  console.log(compactBanner());
  console.log();
  console.log(
    box(
      [
        color.bold("Usage"),
        color.dim("  rexa <command>") + "    " + color.dim("(globally installed)"),
        color.dim("  npm run <script>") + "  " + color.dim("(from a clone)"),
      ].join("\n"),
      { borderColor: color.brightBlue },
    ),
  );
  console.log();
  console.log(header("Setup & diagnostics"));
  console.log(
    indent(
      [
        `${color.brightCyan("setup")}     ${color.dim("Run interactive setup wizard (system scan, profiles, secrets)")}`,
        `${color.brightCyan("doctor")}    ${color.dim("Verify environment, providers, and API keys")}`,
      ].join("\n"),
      2,
    ),
  );
  console.log();
  console.log(header("Chat surfaces"));
  console.log(
    indent(
      [
        `${color.brightCyan("chat")}      ${color.dim("Interactive CLI chat in this terminal")}`,
        `${color.brightCyan("telegram")}  ${color.dim("Start Telegram bot (needs TELEGRAM_BOT_TOKEN)")}`,
        `${color.brightCyan("whatsapp")}  ${color.dim("WhatsApp via QR pairing (status / logout subcommands)")}`,
        `${color.brightCyan("ws")}        ${color.dim("Start WebSocket chat (alias: websocket)")}`,
        `${color.brightCyan("web")}       ${color.dim("Start localhost web chat UI")}`,
        `${color.brightCyan("api")}       ${color.dim("Start localhost REST API")}`,
      ].join("\n"),
      2,
    ),
  );
  console.log();
  console.log(header("Background daemon & multitasking"));
  console.log(
    indent(
      [
        `${color.brightCyan("daemon")}    ${color.dim("Subcommands: start | stop | status | log")}`,
        `${color.brightCyan("watch")}     ${color.dim("watch <url> --interval 30s --duration 5h --on-change <cmd>")}`,
        `${color.brightCyan("schedule")}  ${color.dim('schedule "<cron>" "<command>"  (5-field cron)')}`,
        `${color.brightCyan("task")}      ${color.dim("Subcommands: list | cancel <id> | rm <id> | log <id>")}`,
      ].join("\n"),
      2,
    ),
  );
  console.log();
  console.log(header("Maintenance"));
  console.log(
    indent(
      [
        `${color.brightCyan("update")}    ${color.dim("Pull latest, install, rebuild, relink")}`,
        `${color.brightCyan("cost")}      ${color.dim("Show token + cost telemetry roll-up")}`,
        `${color.brightCyan("demo")}      ${color.dim("Run main-agent + sub-agent demo flow")}`,
      ].join("\n"),
      2,
    ),
  );
  console.log();
  console.log(divider());
  console.log(color.dim("Examples: ") + color.brightCyan("rexa setup") + color.dim(" • ") + color.brightCyan("rexa chat") + color.dim(" • ") + color.brightCyan("rexa daemon start") + color.dim(" • ") + color.brightCyan("REXA_TOKEN_SAVER=1 rexa chat"));
}

// ---------- Daemon / multitasking commands ----------

async function runDaemonCommand(args: string[], home: string): Promise<void> {
  const { DaemonManager } = await import("./daemon/daemon-manager");
  const { loadConfig } = await import("./app/config");
  const bundle = await loadConfig(home);
  const manager = new DaemonManager(bundle.app.daemon);
  const sub = args[0] ?? "status";

  if (sub === "start") {
    const entrypoint = resolveDaemonEntrypoint(home);
    const status = await manager.start(entrypoint);
    console.log(`${color.green("✔")} daemon running pid=${status.pid}`);
    console.log(color.dim(`log: ${manager.logPath()}`));
    return;
  }
  if (sub === "stop") {
    const stopped = await manager.stop();
    console.log(stopped ? `${color.green("✔")} daemon stopped` : color.dim("daemon not running"));
    return;
  }
  if (sub === "status") {
    const status = await manager.status();
    console.log(table([
      [color.dim("running"), status.running ? color.green("yes") : color.yellow("no")],
      [color.dim("pid"), status.pid !== null ? String(status.pid) : color.dim("-")],
      [color.dim("started"), status.startedAt ?? color.dim("-")],
      [color.dim("pidfile"), status.pidFile],
    ]));
    return;
  }
  if (sub === "log") {
    const { spawn } = await import("node:child_process");
    spawn("tail", ["-f", manager.logPath()], { stdio: "inherit" });
    return;
  }
  console.error(color.red(`Unknown daemon subcommand: ${sub}`));
  process.exitCode = 1;
}

function resolveDaemonEntrypoint(home: string): string {
  const compiled = join(home, "dist", "src", "daemon", "daemon-worker.js");
  return compiled;
}

async function runWatchCommand(args: string[], home: string): Promise<void> {
  const url = args[0];
  if (!url || url.startsWith("--")) {
    console.error(color.red("usage: rexa watch <url> [--interval 30s] [--duration 5h] [--on-change <cmd>]"));
    process.exitCode = 1;
    return;
  }
  const interval = parseDurationFlag(args, "--interval", "30s");
  const duration = parseDurationFlag(args, "--duration", "0");
  const onChange = parseStringFlag(args, "--on-change");
  const queue = await openQueue(home);
  const expiresAt = duration > 0 ? new Date(Date.now() + duration).toISOString() : null;
  const task = await queue.create({
    kind: "watch",
    payload: { url },
    intervalMs: interval,
    nextRunAt: new Date(Date.now() + 1_000).toISOString(),
    expiresAt,
    cron: null,
    onChange: onChange ?? null,
  });
  console.log(`${color.green("✔")} watch queued id=${task.id}`);
  console.log(color.dim(`Run \`rexa daemon start\` (if not already) so the watcher executes.`));
}

async function runScheduleCommand(args: string[], home: string): Promise<void> {
  const cron = args[0];
  const command = args.slice(1).join(" ");
  if (!cron || !command) {
    console.error(color.red('usage: rexa schedule "<cron>" "<command>"'));
    process.exitCode = 1;
    return;
  }
  const queue = await openQueue(home);
  const task = await queue.create({
    kind: "schedule",
    payload: { command },
    cron,
    intervalMs: null,
    nextRunAt: new Date(Date.now() + 60_000).toISOString(),
    expiresAt: null,
    onChange: null,
  });
  console.log(`${color.green("✔")} scheduled id=${task.id} (${cron})`);
}

async function runTaskCommand(args: string[], home: string): Promise<void> {
  const queue = await openQueue(home);
  const sub = args[0] ?? "list";
  if (sub === "list") {
    const tasks = await queue.list();
    if (tasks.length === 0) {
      console.log(color.dim("(no tasks)"));
      return;
    }
    console.log(table(tasks.map((task) => [
      task.id.slice(0, 12),
      task.kind,
      task.status,
      task.cron ?? (task.intervalMs ? `${task.intervalMs}ms` : "once"),
      task.nextRunAt ?? "-",
      `runs=${task.runCount}`,
    ])));
    return;
  }
  if (sub === "cancel") {
    const id = args[1];
    if (!id) {
      console.error(color.red("usage: rexa task cancel <id>"));
      process.exitCode = 1;
      return;
    }
    const ok = await queue.cancel(id);
    console.log(ok ? `${color.green("✔")} cancelled ${id}` : color.red(`task not found: ${id}`));
    return;
  }
  if (sub === "rm") {
    const id = args[1];
    if (!id) {
      console.error(color.red("usage: rexa task rm <id>"));
      process.exitCode = 1;
      return;
    }
    const ok = await queue.remove(id);
    console.log(ok ? `${color.green("✔")} removed ${id}` : color.red(`task not found: ${id}`));
    return;
  }
  console.error(color.red(`Unknown task subcommand: ${sub}`));
  process.exitCode = 1;
}

async function runCostCommand(_args: string[], home: string): Promise<void> {
  const { Telemetry } = await import("./logs/telemetry");
  const telemetry = new Telemetry({ enabled: true, logPath: join(home, "logs", "telemetry.jsonl"), persistCost: true });
  const summary = await telemetry.summary();
  if (summary.totalEvents === 0) {
    console.log(color.dim("No telemetry events yet."));
    return;
  }
  console.log(section("Cost rollup") + "\n");
  console.log(table([
    [color.dim("events"), String(summary.totalEvents)],
    [color.dim("input tokens"), summary.totalInputTokens.toLocaleString()],
    [color.dim("output tokens"), summary.totalOutputTokens.toLocaleString()],
    [color.dim("total cost"), `$${summary.totalCostUsd.toFixed(4)}`],
    [color.dim("first event"), summary.firstAt ?? "-"],
    [color.dim("last event"), summary.lastAt ?? "-"],
  ]));
  console.log("\n" + section("By provider") + "\n");
  console.log(table(Object.entries(summary.byProvider).map(([provider, stats]) => [
    provider, `${stats.events} ev`, `$${stats.costUsd.toFixed(4)}`,
  ])));
  console.log("\n" + section("By role") + "\n");
  console.log(table(Object.entries(summary.byRole).map(([role, stats]) => [
    role, `${stats.events} ev`, `$${stats.costUsd.toFixed(4)}`,
  ])));
}

async function runUpdateCommand(home: string): Promise<void> {
  const { spawnSync } = await import("node:child_process");
  console.log(color.dim(`Updating Rexa at ${home}...`));
  const steps: Array<{ label: string; cmd: string; args: string[] }> = [
    { label: "git fetch", cmd: "git", args: ["-C", home, "fetch", "--all", "--prune"] },
    { label: "git pull", cmd: "git", args: ["-C", home, "pull", "--ff-only"] },
    { label: "npm install", cmd: "npm", args: ["--prefix", home, "install"] },
    { label: "npm run build", cmd: "npm", args: ["--prefix", home, "run", "build"] },
  ];
  for (const step of steps) {
    console.log(color.dim(`> ${step.label}`));
    const result = spawnSync(step.cmd, step.args, { stdio: "inherit" });
    if (result.status !== 0) {
      console.error(color.red(`${step.label} failed (exit ${result.status})`));
      process.exitCode = 1;
      return;
    }
  }
  console.log(`${color.green("✔")} update complete`);
}

async function openQueue(home: string) {
  const { TaskQueue } = await import("./daemon/task-queue");
  const { loadConfig } = await import("./app/config");
  const bundle = await loadConfig(home);
  const path = bundle.app.daemon.queuePath.startsWith("/")
    ? bundle.app.daemon.queuePath
    : join(home, bundle.app.daemon.queuePath);
  const queue = new TaskQueue(path);
  await queue.load();
  return queue;
}

function parseDurationFlag(args: string[], name: string, fallback: string): number {
  const idx = args.indexOf(name);
  if (idx === -1 || !args[idx + 1]) return parseDuration(fallback);
  return parseDuration(args[idx + 1]);
}

function parseStringFlag(args: string[], name: string): string | null {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function parseDuration(text: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(text.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();
  const multipliers: Record<string, number> = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] ?? 1_000);
}

main().catch((error) => {
  console.error(color.red(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
