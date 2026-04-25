import { describe, expect, test } from "vitest";
import { defaultAppConfig } from "../src/app/config";
import { applyChoiceKey } from "../src/cli/keyboard-menu";
import { providerSecretsNeeded } from "../src/cli/setup-wizard";

describe("setup wizard config", () => {
  test("default app config includes chat provider and browser reporting settings", () => {
    const config = defaultAppConfig();

    expect(config.chatProviders.telegram).toMatchObject({ enabled: false, tokenEnv: "TELEGRAM_BOT_TOKEN" });
    expect(config.chatProviders.whatsapp).toMatchObject({ enabled: false, mode: "cloud-api" });
    expect(config.browserAgent).toMatchObject({
      enabled: true,
      pointerEnabled: true,
      screenshotUpdates: true,
    });
  });

  test("left and right keys rotate setup choices", () => {
    const choices = ["cli", "telegram", "whatsapp"];

    expect(applyChoiceKey({ choices, index: 0 }, "right").index).toBe(1);
    expect(applyChoiceKey({ choices, index: 0 }, "left").index).toBe(2);
  });

  test("telegram setup requests BotFather token when env is missing", () => {
    const config = defaultAppConfig();
    config.enabledChatProviders = ["telegram"];
    config.chatProviders.telegram.enabled = true;

    expect(providerSecretsNeeded(config, {})).toEqual(["TELEGRAM_BOT_TOKEN"]);
  });
});
