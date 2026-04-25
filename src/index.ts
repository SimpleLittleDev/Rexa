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
    const runtime = await createRexaRuntime();
    const whatsapp = new WhatsAppChatProvider();
    attachAgentToChatProvider(whatsapp, runtime.agent);
    await whatsapp.start();
    console.log(`${color.green("✔")} Rexa WhatsApp webhook listening on ${whatsapp.url()}`);
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
        `${color.brightCyan("whatsapp")}  ${color.dim("Start WhatsApp Cloud API webhook")}`,
        `${color.brightCyan("ws")}        ${color.dim("Start WebSocket chat (alias: websocket)")}`,
        `${color.brightCyan("web")}       ${color.dim("Start localhost web chat UI")}`,
        `${color.brightCyan("api")}       ${color.dim("Start localhost REST API")}`,
      ].join("\n"),
      2,
    ),
  );
  console.log();
  console.log(header("Demos"));
  console.log(
    indent(
      [
        `${color.brightCyan("demo")}      ${color.dim("Run main-agent + sub-agent demo flow")}`,
      ].join("\n"),
      2,
    ),
  );
  console.log();
  console.log(divider());
  console.log(color.dim("Examples: ") + color.brightCyan("npm run setup") + color.dim(" • ") + color.brightCyan("npm run chat") + color.dim(" • ") + color.brightCyan("npm run doctor"));
}

main().catch((error) => {
  console.error(color.red(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
