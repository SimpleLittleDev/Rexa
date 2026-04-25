#!/usr/bin/env node
import { join } from "node:path";
import { loadEnvFile } from "./app/env-file";
import { createRexaRuntime, ensureProjectDirs } from "./app/bootstrap";
import { startServer } from "./app/server";
import { attachAgentToChatProvider } from "./chat/chat-runner";
import { CLIChatProvider } from "./chat/cli.provider";
import { TelegramChatProvider } from "./chat/telegram.provider";
import { WebChatProvider } from "./chat/web.provider";
import { WebSocketChatProvider } from "./chat/websocket.provider";
import { WhatsAppChatProvider } from "./chat/whatsapp.provider";
import { SetupWizard } from "./cli/setup-wizard";
import { color } from "./cli/tui";
import { EnvironmentDetector } from "./env/detector";
import { CLIProviderDetector } from "./llm/cli-provider-detector";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "help";
  await ensureProjectDirs();
  await loadEnvFile(join(process.cwd(), ".env"));

  if (command === "setup") {
    await new SetupWizard().run();
    return;
  }

  if (command === "doctor") {
    const env = await new EnvironmentDetector().detect();
    const providers = await new CLIProviderDetector().detectAll();
    console.log(JSON.stringify({ environment: env, cliProviders: providers }, null, 2));
    return;
  }

  if (command === "chat") {
    const runtime = await createRexaRuntime();
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
    console.log("Rexa Telegram bot running.");
    return;
  }

  if (command === "whatsapp") {
    const runtime = await createRexaRuntime();
    const whatsapp = new WhatsAppChatProvider();
    attachAgentToChatProvider(whatsapp, runtime.agent);
    await whatsapp.start();
    console.log(`Rexa WhatsApp webhook listening on ${whatsapp.url()}`);
    return;
  }

  if (command === "ws" || command === "websocket") {
    const runtime = await createRexaRuntime();
    const websocket = new WebSocketChatProvider();
    attachAgentToChatProvider(websocket, runtime.agent);
    await websocket.start();
    console.log(`Rexa WebSocket listening on ws://127.0.0.1:${process.env.REXA_WS_PORT ?? 8788}`);
    return;
  }

  if (command === "web") {
    const runtime = await createRexaRuntime();
    const web = new WebChatProvider();
    attachAgentToChatProvider(web, runtime.agent);
    await web.start();
    console.log(`Rexa web chat listening on http://127.0.0.1:${process.env.REXA_WEB_PORT ?? 8787}`);
    return;
  }

  if (command === "api") {
    const runtime = await createRexaRuntime();
    await startServer(runtime.agent);
    console.log("Rexa API listening on http://127.0.0.1:8786");
    return;
  }

  if (command === "demo-flow") {
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

  printHelp();
}

function printHelp(): void {
  console.log(`Rexa commands:
  rexa setup       Run setup wizard
  rexa chat        Start CLI chat
  rexa telegram    Start Telegram bot provider
  rexa whatsapp    Start WhatsApp Cloud API webhook provider
  rexa ws          Start WebSocket chat provider
  rexa web         Start localhost web chat provider
  rexa doctor      Detect environment and providers
  rexa api         Start localhost REST API
  rexa demo-flow   Run main-agent + sub-agent demo
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
