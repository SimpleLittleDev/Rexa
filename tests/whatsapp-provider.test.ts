import { describe, expect, test } from "vitest";
import { WhatsAppChatProvider } from "../src/chat/whatsapp.provider";

describe("WhatsAppChatProvider", () => {
  test("requires cloud API env vars before start", async () => {
    const provider = new WhatsAppChatProvider({
      accessToken: "",
      phoneNumberId: "",
      verifyToken: "",
      port: 8797,
    });

    await expect(provider.start()).rejects.toThrow("WhatsApp Cloud API is not configured");
  });
});
