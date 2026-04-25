import { stdin as input, stdout as output } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { banner } from "./banner";
import { color, spinner, status, table } from "./tui";
import { runKeyboardWizard, type SetupField } from "./keyboard-menu";
import { promptSecret } from "./secret-prompt";
import { loadEnvFile, writeEnvValue } from "../app/env-file";
import { EnvironmentDetector } from "../env/detector";
import { CLIProviderDetector } from "../llm/cli-provider-detector";
import { loadConfig, type AppConfig } from "../app/config";

export class SetupWizard {
  async run(rootDir = process.cwd()): Promise<void> {
    output.write(`${color.cyan(banner())}\n\n`);
    const env = await spinner("Detecting environment", () => new EnvironmentDetector().detect());
    const cli = await spinner("Checking CLI LLM providers", () => new CLIProviderDetector().detectAll());

    output.write(`\n${color.bold("Environment")}\n`);
    output.write(
      table([
        ["OS", `${env.os} ${env.architecture}`],
        ["Termux", status(env.isTermux, "yes", "no")],
        ["Node.js", env.nodeVersion],
        ["npm", env.npmVersion ?? color.red("missing")],
        ["Browser", env.browser.recommendedMode],
        ["Shell", env.shell ?? "unknown"],
      ]),
    );
    output.write("\n\n");

    output.write(`${color.bold("Provider Status")}\n`);
    for (const provider of cli) {
      const state = provider.ready ? color.green("ready") : provider.installed ? color.yellow("needs auth") : color.red("missing");
      output.write(`${provider.provider.padEnd(14)} ${state} ${provider.version ?? ""}\n`);
      if (!provider.installed) {
        output.write(`  install: ${provider.installCommand}\n  auth:    ${provider.authCommand}\n`);
      } else if (!provider.authenticated) {
        output.write(`  auth:    Jalankan '${provider.authCommand}' lalu selesaikan login manual.\n`);
      }
    }

    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    const defaults = await loadConfig(rootDir);

    if (interactive) {
      const fields = await runKeyboardWizard("Rexa Setup", setupFields(defaults), { enabled: true });
      applySetupFields(defaults, fields);
      await collectProviderSecrets(rootDir, defaults.app);
    }

    await mkdir(join(rootDir, "config"), { recursive: true });
    await writeConfig(rootDir, "app.config.json", defaults.app);
    await writeConfig(rootDir, "models.config.json", defaults.models);
    await writeConfig(rootDir, "agents.config.json", defaults.agents);
    await writeConfig(rootDir, "storage.config.json", defaults.storage);

    output.write(`\n${color.green("Config saved")}\n`);
    output.write(
      table([
        ["Storage", defaults.storage.defaultStorage],
        ["Main provider", defaults.models.roles.main.provider],
        ["Main model", defaults.models.roles.main.model],
        ["Permission", defaults.app.permissionMode],
        ["Browser", defaults.app.browserMode],
        ["Chat", defaults.app.enabledChatProviders.join(", ")],
        ["Browser updates", defaults.app.browserAgent.screenshotUpdates ? "on" : "off"],
      ]),
    );
    output.write("\n");
  }
}

export function providerSecretsNeeded(app: AppConfig, env: Record<string, string | undefined>): string[] {
  const needed: string[] = [];
  if (app.chatProviders.telegram.enabled && !env[app.chatProviders.telegram.tokenEnv]) {
    needed.push(app.chatProviders.telegram.tokenEnv);
  }
  if (app.chatProviders.whatsapp.enabled) {
    const whatsapp = app.chatProviders.whatsapp;
    for (const key of [whatsapp.accessTokenEnv, whatsapp.phoneNumberIdEnv, whatsapp.verifyTokenEnv]) {
      if (!env[key]) needed.push(key);
    }
  }
  return needed;
}

async function collectProviderSecrets(rootDir: string, app: AppConfig): Promise<void> {
  const envPath = join(rootDir, ".env");
  const existingEnv = { ...process.env, ...(await loadEnvFile(envPath)) };
  const needed = providerSecretsNeeded(app, existingEnv);
  if (needed.length === 0) return;

  output.write(`\n${color.bold("Provider Secrets")}\n`);
  output.write(color.dim("Secret disimpan ke .env lokal dengan permission 600, bukan ke config JSON.\n"));

  for (const key of needed) {
    const label = secretLabel(key);
    const value = await promptSecret(label);
    if (!value) {
      output.write(color.yellow(`Lewati ${key}; provider terkait belum bisa start sampai env ini diisi.\n`));
      continue;
    }
    await writeEnvValue(envPath, key, value);
    process.env[key] = value;
    output.write(color.green(`${key} saved to .env\n`));
  }
}

function secretLabel(key: string): string {
  if (key === "TELEGRAM_BOT_TOKEN") return "Masukkan Telegram Bot Token dari BotFather";
  if (key === "WHATSAPP_ACCESS_TOKEN") return "Masukkan WhatsApp Cloud API access token";
  if (key === "WHATSAPP_PHONE_NUMBER_ID") return "Masukkan WhatsApp phone number id";
  if (key === "WHATSAPP_VERIFY_TOKEN") return "Masukkan WhatsApp webhook verify token";
  return `Masukkan ${key}`;
}

async function writeConfig(rootDir: string, fileName: string, value: unknown): Promise<void> {
  await writeFile(join(rootDir, "config", fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function setupFields(config: Awaited<ReturnType<typeof loadConfig>>): SetupField[] {
  return [
    {
      label: "Storage",
      value: config.storage.defaultStorage,
      choices: ["json", "sqlite", "postgres", "memory"],
      help: "JSON paling aman di Termux; SQLite untuk local app; Postgres untuk VPS.",
    },
    {
      label: "Permission",
      value: config.app.permissionMode,
      choices: ["safe", "balanced", "power-user"],
      help: "Safe banyak konfirmasi; balanced default; power-user tetap konfirmasi aksi destruktif.",
    },
    {
      label: "Main provider",
      value: config.models.roles.main?.provider ?? "mock",
      choices: ["codex-cli", "openai", "anthropic", "claude-code", "gemini", "openrouter", "ollama", "mock"],
      help: "Provider utama Rexa. Worker dinamis dipaksa pakai provider yang sama jika policy aktif.",
    },
    {
      label: "Main model",
      value: config.models.roles.main?.model ?? "gpt-5.5",
      choices: ["gpt-5.5", "gpt-5.4", "auto", "local-small-model", "local-mock-main"],
      help: "Nama model dibaca dari config. Pastikan provider mendukung model pilihan.",
    },
    {
      label: "Coding model",
      value: config.models.roles.coding?.model ?? "gpt-5.4",
      choices: ["gpt-5.5", "gpt-5.4", "auto", "local-small-model", "local-mock-coding"],
      help: "Role model untuk coding/fallback task.",
    },
    {
      label: "Chat provider",
      value: firstEnabledChat(config.app.enabledChatProviders),
      choices: ["cli", "telegram", "whatsapp", "rest", "websocket", "web", "all-local"],
      help: "Telegram/WhatsApp butuh token/env. all-local aktifkan CLI, REST, WebSocket, dan Web.",
    },
    {
      label: "Browser mode",
      value: config.app.browserMode,
      choices: ["termux-chromium", "playwright", "remote-browser", "limited"],
      help: "Termux Chromium untuk Android fallback; Playwright untuk Linux/Windows; remote untuk browserless.",
    },
    {
      label: "Browser screenshots",
      value: config.app.browserAgent.screenshotUpdates ? "on" : "off",
      choices: ["on", "off"],
      help: "Jika on, aksi browser mengirim progress + screenshot ke provider chat.",
    },
    {
      label: "Mouse pointer",
      value: config.app.browserAgent.pointerEnabled ? "on" : "off",
      choices: ["on", "off"],
      help: "Jika on, browser tool memakai pointer/mouse coordinates untuk aksi visual.",
    },
    {
      label: "Dynamic workers",
      value: config.agents.subAgentPolicy.enabled ? "on" : "off",
      choices: ["on", "off"],
      help: "Jika on, main agent boleh mendesain dan spawn worker runtime sesuai task.",
    },
  ];
}

function applySetupFields(config: Awaited<ReturnType<typeof loadConfig>>, fields: SetupField[]): void {
  const value = (label: string) => fields.find((field) => field.label === label)?.value;

  const storage = value("Storage");
  if (storage && ["json", "sqlite", "postgres", "memory"].includes(storage)) {
    config.storage.defaultStorage = storage as typeof config.storage.defaultStorage;
  }

  const permission = value("Permission");
  if (permission && ["safe", "balanced", "power-user"].includes(permission)) {
    config.app.permissionMode = permission as typeof config.app.permissionMode;
  }

  const mainProvider = value("Main provider");
  if (mainProvider) {
    config.models.roles.main.provider = mainProvider;
    config.agents.mainAgent.provider = mainProvider;
  }

  const mainModel = value("Main model");
  if (mainModel) {
    config.models.roles.main.model = mainModel;
    config.agents.mainAgent.model = mainModel;
  }

  const codingModel = value("Coding model");
  if (codingModel && config.models.roles.coding) {
    config.models.roles.coding.model = codingModel;
  }

  const chat = value("Chat provider");
  if (chat) applyChatSelection(config, chat);

  const browserMode = value("Browser mode");
  if (browserMode && ["playwright", "termux-chromium", "remote-browser", "limited"].includes(browserMode)) {
    config.app.browserMode = browserMode as typeof config.app.browserMode;
  }

  config.app.browserAgent.screenshotUpdates = value("Browser screenshots") === "on";
  config.app.browserAgent.pointerEnabled = value("Mouse pointer") === "on";
  config.agents.subAgentPolicy.enabled = value("Dynamic workers") === "on";
}

function applyChatSelection(config: Awaited<ReturnType<typeof loadConfig>>, selection: string): void {
  config.app.chatProviders.cli.enabled = false;
  config.app.chatProviders.telegram.enabled = false;
  config.app.chatProviders.whatsapp.enabled = false;
  config.app.chatProviders.rest.enabled = false;
  config.app.chatProviders.websocket.enabled = false;
  config.app.chatProviders.web.enabled = false;

  if (selection === "all-local") {
    config.app.enabledChatProviders = ["cli", "rest", "websocket", "web"];
    config.app.chatProviders.cli.enabled = true;
    config.app.chatProviders.rest.enabled = true;
    config.app.chatProviders.websocket.enabled = true;
    config.app.chatProviders.web.enabled = true;
    return;
  }

  config.app.enabledChatProviders = [selection];
  if (selection === "cli") config.app.chatProviders.cli.enabled = true;
  if (selection === "telegram") config.app.chatProviders.telegram.enabled = true;
  if (selection === "whatsapp") config.app.chatProviders.whatsapp.enabled = true;
  if (selection === "rest") config.app.chatProviders.rest.enabled = true;
  if (selection === "websocket") config.app.chatProviders.websocket.enabled = true;
  if (selection === "web") config.app.chatProviders.web.enabled = true;
}

function firstEnabledChat(providers: string[]): string {
  if (providers.includes("telegram")) return "telegram";
  if (providers.includes("whatsapp")) return "whatsapp";
  if (providers.includes("websocket")) return "websocket";
  if (providers.includes("web")) return "web";
  if (providers.includes("rest")) return "rest";
  return providers[0] ?? "cli";
}
