import { stdin as input, stdout as output } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { banner } from "./banner";
import { box, color, divider, indent, header, section, spinner, status, table } from "./tui";
import { confirm, pickOne, runKeyboardWizard, type SetupField } from "./keyboard-menu";
import { promptSecret } from "./secret-prompt";
import { loadEnvFile, writeEnvValue } from "../app/env-file";
import { resolveRexaHome } from "../app/paths";
import { EnvironmentDetector } from "../env/detector";
import { detectChromiumExecutable } from "../tools/browser/chromium.adapter";
import { CLIProviderDetector } from "../llm/cli-provider-detector";
import { loadConfig, type AppConfig } from "../app/config";

type Profile = "developer" | "researcher" | "power-user" | "minimal" | "custom";

interface ProfileBundle {
  permission: AppConfig["permissionMode"];
  storage: "json" | "sqlite" | "postgres" | "memory";
  mainProvider: string;
  mainModel: string;
  codingModel: string;
  chat: string;
  browserMode: AppConfig["browserMode"];
  browserScreenshots: boolean;
  pointer: boolean;
  dynamicWorkers: boolean;
  description: string;
}

const PROFILES: Record<Exclude<Profile, "custom">, ProfileBundle> = {
  developer: {
    permission: "balanced",
    storage: "sqlite",
    mainProvider: "openai",
    mainModel: "gpt-4.1",
    codingModel: "claude-sonnet-4-20250514",
    chat: "cli",
    browserMode: "auto",
    browserScreenshots: true,
    pointer: true,
    dynamicWorkers: true,
    description: "Coding-heavy: GPT-4.1 + Claude Sonnet 4, full browser automation, dynamic workers.",
  },
  researcher: {
    permission: "balanced",
    storage: "sqlite",
    mainProvider: "openai",
    mainModel: "gpt-4.1",
    codingModel: "gpt-4.1",
    chat: "cli",
    browserMode: "auto",
    browserScreenshots: true,
    pointer: true,
    dynamicWorkers: true,
    description: "Research-first: long-context GPT-4.1, screenshot evidence, vector memory.",
  },
  "power-user": {
    permission: "power-user",
    storage: "sqlite",
    mainProvider: "openai",
    mainModel: "gpt-4.1",
    codingModel: "claude-sonnet-4-20250514",
    chat: "all-local",
    browserMode: "chromium",
    browserScreenshots: true,
    pointer: true,
    dynamicWorkers: true,
    description: "All chat surfaces enabled, native Chromium, max worker concurrency.",
  },
  minimal: {
    permission: "safe",
    storage: "json",
    mainProvider: "mock",
    mainModel: "local-mock-main",
    codingModel: "local-mock-coding",
    chat: "cli",
    browserMode: "limited",
    browserScreenshots: false,
    pointer: false,
    dynamicWorkers: false,
    description: "Offline-friendly mock provider, no browser automation, safe defaults.",
  },
};

export class SetupWizard {
  async run(rootDir = resolveRexaHome()): Promise<void> {
    output.write("\x1b[2J\x1b[H");
    output.write(banner() + "\n\n");
    output.write(
      box(
        [
          color.bold("Welcome to Rexa setup."),
          "Wizard ini akan menyiapkan environment, provider, browser, storage, dan chat surface.",
          color.dim(`Rexa home: ${rootDir}`),
          color.dim("Tekan Enter di tiap step untuk lanjut, q untuk batal."),
        ].join("\n"),
        { title: "Rexa", borderColor: color.brightMagenta },
      ),
    );
    output.write("\n\n");

    output.write(section("System scan"));
    output.write("\n");
    const env = await spinner("Detecting environment", () => new EnvironmentDetector().detect());
    const cli = await spinner("Checking CLI LLM providers", () => new CLIProviderDetector().detectAll());
    const chromiumPath = await spinner("Looking for Chromium binary", () => detectChromiumExecutable());

    output.write("\n");
    output.write(
      table([
        [color.dim("OS"), `${env.os} ${env.architecture}`],
        [color.dim("Node.js"), env.nodeVersion],
        [color.dim("npm"), env.npmVersion ?? color.red("missing")],
        [color.dim("Shell"), env.shell ?? "unknown"],
        [color.dim("Recommended browser"), env.browser.recommendedMode],
        [color.dim("Chromium binary"), chromiumPath ?? color.yellow("not detected")],
        [color.dim("Playwright pkg"), status(env.browser.playwrightPackage, "installed", "missing")],
      ]),
    );
    output.write("\n\n");

    output.write(section("CLI LLM providers"));
    output.write("\n");
    for (const provider of cli) {
      const state = provider.ready
        ? color.green("ready")
        : provider.installed
          ? color.yellow("needs auth")
          : color.red("missing");
      output.write(`  ${color.bold(provider.provider.padEnd(14))} ${state} ${color.dim(provider.version ?? "")}\n`);
      if (!provider.installed) output.write(indent(color.dim(`install: ${provider.installCommand}\nauth:    ${provider.authCommand}`), 4) + "\n");
      else if (!provider.authenticated) output.write(indent(color.dim(`auth: ${provider.authCommand}`), 4) + "\n");
    }
    output.write("\n");

    const interactive = Boolean(input.isTTY && output.isTTY);
    const defaults = await loadConfig(rootDir);

    if (interactive) {
      output.write(section("Profile preset"));
      output.write("\n");
      output.write(color.dim("Pilih starting point. Bisa di-tweak di langkah berikut.\n"));
      const profile = (await pickOne("Profile", ["developer", "researcher", "power-user", "minimal", "custom"], 0)) as Profile;
      if (profile !== "custom") applyProfile(defaults, PROFILES[profile]);
      output.write(color.dim(`\n${PROFILES[profile === "custom" ? "developer" : profile].description}\n\n`));

      const fields = await runKeyboardWizard("Rexa Setup — fine tune", setupFields(defaults, env.browser.recommendedMode), {
        enabled: true,
      });
      applySetupFields(defaults, fields);
      await collectProviderSecrets(rootDir, defaults.app);
    }

    await mkdir(join(rootDir, "config"), { recursive: true });
    await writeConfig(rootDir, "app.config.json", defaults.app);
    await writeConfig(rootDir, "models.config.json", defaults.models);
    await writeConfig(rootDir, "agents.config.json", defaults.agents);
    await writeConfig(rootDir, "storage.config.json", defaults.storage);

    output.write("\n");
    output.write(
      box(
        [
          color.green("Configuration saved successfully!"),
          "",
          ...renderSummary(defaults),
        ].join("\n"),
        { title: "Saved", borderColor: color.brightGreen },
      ),
    );
    output.write("\n\n");

    output.write(header("Next steps", "Try one of these to get started"));
    output.write("\n");
    output.write(
      indent(
        [
          `${color.brightCyan("›")} ${color.bold("npm run chat")}      ${color.dim("— interactive chat in this terminal")}`,
          `${color.brightCyan("›")} ${color.bold("npm run doctor")}    ${color.dim("— verify provider/auth/browser readiness")}`,
          `${color.brightCyan("›")} ${color.bold("npm run demo")}      ${color.dim("— run the planner + sub-agent demo flow")}`,
          `${color.brightCyan("›")} ${color.bold("npm run dev help")}  ${color.dim("— show all CLI commands")}`,
        ].join("\n"),
        2,
      ),
    );
    output.write("\n");

    if (interactive) {
      output.write(divider() + "\n");
      const launchNow = await confirm("Start chat session sekarang?", { default: false });
      if (launchNow) {
        const { CLIChatProvider } = await import("../chat/cli.provider");
        const cliChat = new CLIChatProvider();
        await cliChat.start();
      }
    }
  }
}

function applyProfile(defaults: Awaited<ReturnType<typeof loadConfig>>, bundle: ProfileBundle): void {
  defaults.storage.defaultStorage = bundle.storage;
  defaults.app.permissionMode = bundle.permission;
  defaults.app.browserMode = bundle.browserMode;
  defaults.app.browserAgent.screenshotUpdates = bundle.browserScreenshots;
  defaults.app.browserAgent.pointerEnabled = bundle.pointer;
  defaults.agents.subAgentPolicy.enabled = bundle.dynamicWorkers;

  defaults.models.roles.main.provider = bundle.mainProvider;
  defaults.models.roles.main.model = bundle.mainModel;
  defaults.agents.mainAgent.provider = bundle.mainProvider;
  defaults.agents.mainAgent.model = bundle.mainModel;
  if (defaults.models.roles.coding) {
    defaults.models.roles.coding.model = bundle.codingModel;
  }
  applyChatSelection(defaults, bundle.chat);
}

function renderSummary(defaults: Awaited<ReturnType<typeof loadConfig>>): string[] {
  const rows: Array<[string, string]> = [
    ["Storage", defaults.storage.defaultStorage],
    ["Permission", defaults.app.permissionMode],
    ["Main provider", defaults.models.roles.main.provider],
    ["Main model", defaults.models.roles.main.model],
    ["Coding model", defaults.models.roles.coding?.model ?? "—"],
    ["Browser mode", defaults.app.browserMode],
    ["Browser updates", defaults.app.browserAgent.screenshotUpdates ? "on" : "off"],
    ["Pointer", defaults.app.browserAgent.pointerEnabled ? "on" : "off"],
    ["Dynamic workers", defaults.agents.subAgentPolicy.enabled ? "on" : "off"],
    ["Chat surfaces", defaults.app.enabledChatProviders.join(", ") || "—"],
  ];
  return [table(rows.map(([k, v]) => [color.dim(k), color.bold(v)]))];
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

  output.write("\n" + section("Provider secrets") + "\n");
  output.write(color.dim("Secret disimpan ke .env (permission 600), bukan ke config JSON.\n\n"));

  for (const key of needed) {
    const label = secretLabel(key);
    const value = await promptSecret(label);
    if (!value) {
      output.write(color.yellow(`  Lewati ${key}; provider terkait belum bisa start.\n`));
      continue;
    }
    await writeEnvValue(envPath, key, value);
    process.env[key] = value;
    output.write(color.green(`  ${key} saved\n`));
  }
}

function secretLabel(key: string): string {
  if (key === "TELEGRAM_BOT_TOKEN") return "Telegram Bot Token (BotFather)";
  if (key === "WHATSAPP_ACCESS_TOKEN") return "WhatsApp Cloud API access token";
  if (key === "WHATSAPP_PHONE_NUMBER_ID") return "WhatsApp phone number id";
  if (key === "WHATSAPP_VERIFY_TOKEN") return "WhatsApp webhook verify token";
  return `Set value untuk ${key}`;
}

async function writeConfig(rootDir: string, fileName: string, value: unknown): Promise<void> {
  await writeFile(join(rootDir, "config", fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function setupFields(
  config: Awaited<ReturnType<typeof loadConfig>>,
  recommendedBrowser: string,
): SetupField[] {
  const browserChoices = ["auto", "chromium", "playwright", "remote-browser", "limited"] as const;
  return [
    {
      group: "Engine",
      label: "Storage",
      value: config.storage.defaultStorage,
      choices: ["json", "sqlite", "postgres", "memory"],
      help: "JSON paling portable, SQLite cocok untuk personal use, Postgres untuk shared/server.",
    },
    {
      group: "Engine",
      label: "Permission",
      value: config.app.permissionMode,
      choices: ["safe", "balanced", "power-user"],
      help: "Safe minta konfirmasi sering, balanced default, power-user tetap konfirmasi destruktif.",
    },
    {
      group: "Models",
      label: "Main provider",
      value: config.models.roles.main?.provider ?? "openai",
      choices: ["openai", "anthropic", "openrouter", "gemini", "ollama", "codex-cli", "claude-code", "mock"],
      help: "Provider utama untuk routing role 'main' / 'browser' / 'research'.",
    },
    {
      group: "Models",
      label: "Main model",
      value: config.models.roles.main?.model ?? "gpt-4.1",
      choices: [
        "gpt-4.1",
        "gpt-4.1-mini",
        "gpt-4o",
        "gpt-4o-mini",
        "claude-sonnet-4-20250514",
        "claude-opus-4-20250514",
        "claude-haiku-4-20250514",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "auto",
        "local-mock-main",
      ],
      help: "Model spesifik. Pastikan provider mendukung nama model ini.",
    },
    {
      group: "Models",
      label: "Coding model",
      value: config.models.roles.coding?.model ?? "claude-sonnet-4-20250514",
      choices: [
        "claude-sonnet-4-20250514",
        "claude-opus-4-20250514",
        "gpt-4.1",
        "gpt-4o",
        "auto",
        "local-mock-coding",
      ],
      help: "Role model untuk task coding/refactor/review.",
    },
    {
      group: "Surfaces",
      label: "Chat provider",
      value: firstEnabledChat(config.app.enabledChatProviders),
      choices: ["cli", "telegram", "whatsapp", "rest", "websocket", "web", "all-local"],
      help: "Telegram/WhatsApp butuh token. all-local aktifkan CLI + REST + WebSocket + Web sekaligus.",
    },
    {
      group: "Browser",
      label: "Browser mode",
      value: config.app.browserMode === ("termux-chromium" as unknown as string)
        ? (recommendedBrowser as AppConfig["browserMode"])
        : config.app.browserMode,
      choices: [...browserChoices],
      help: "auto pilih otomatis. chromium pakai binary lokal. playwright pakai managed install. remote untuk browserless.",
    },
    {
      group: "Browser",
      label: "Browser screenshots",
      value: config.app.browserAgent.screenshotUpdates ? "on" : "off",
      choices: ["on", "off"],
      help: "Kirim progress + screenshot tiap aksi browser ke chat surface yang aktif.",
    },
    {
      group: "Browser",
      label: "Mouse pointer",
      value: config.app.browserAgent.pointerEnabled ? "on" : "off",
      choices: ["on", "off"],
      help: "Aktifkan untuk visual click via mouse coordinates.",
    },
    {
      group: "Workers",
      label: "Dynamic workers",
      value: config.agents.subAgentPolicy.enabled ? "on" : "off",
      choices: ["on", "off"],
      help: "Boleh spawn sub-agent runtime sesuai task (max 3 default).",
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
  if (browserMode && ["chromium", "playwright", "remote-browser", "auto", "limited"].includes(browserMode)) {
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
