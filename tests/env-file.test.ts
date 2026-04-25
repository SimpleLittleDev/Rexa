import { describe, expect, test } from "vitest";
import { parseEnvFile, setEnvValue } from "../src/app/env-file";

describe("env file helpers", () => {
  test("sets Telegram token without duplicating existing key", () => {
    const next = setEnvValue("OPENAI_API_KEY=\nTELEGRAM_BOT_TOKEN=old\n", "TELEGRAM_BOT_TOKEN", "123:abc");

    expect(parseEnvFile(next).TELEGRAM_BOT_TOKEN).toBe("123:abc");
    expect(next.match(/TELEGRAM_BOT_TOKEN/g)).toHaveLength(1);
  });

  test("quotes env values that contain special characters", () => {
    const next = setEnvValue("", "TELEGRAM_BOT_TOKEN", "123:abc def");

    expect(next).toContain('TELEGRAM_BOT_TOKEN="123:abc def"');
    expect(parseEnvFile(next).TELEGRAM_BOT_TOKEN).toBe("123:abc def");
  });
});
