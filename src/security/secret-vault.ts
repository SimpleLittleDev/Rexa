import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { JsonStorage } from "../storage/json.storage";

export class SecretVault {
  private readonly storage: JsonStorage;
  private readonly key: Buffer;

  constructor(path = "data/vault.json", passphrase = process.env.REXA_VAULT_KEY ?? "local-development-key") {
    this.storage = new JsonStorage(path);
    this.key = createHash("sha256").update(passphrase).digest();
  }

  async init(): Promise<void> {
    await this.storage.connect();
  }

  async setSecret(id: string, secret: string): Promise<void> {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    await this.storage.set("secrets", id, {
      iv: iv.toString("base64"),
      value: encrypted.toString("base64"),
      authTag: authTag.toString("base64"),
    });
  }

  async getSecret(id: string): Promise<string | null> {
    const record = await this.storage.get<{ iv: string; value: string; authTag: string }>("secrets", id);
    if (!record) return null;
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(record.iv, "base64"));
    decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(record.value, "base64")), decipher.final()]).toString("utf8");
  }
}
