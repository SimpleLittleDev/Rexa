import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { JsonStorage } from "../storage/json.storage";
import { logger } from "../logs/logger";

export interface VaultStatus {
  path: string;
  source: "passphrase" | "rexa-vault-key" | "machine-derived";
  warned: boolean;
}

/**
 * Encrypted secret vault.
 *
 * Records are JSON-serialised but each value is encrypted with AES-256-GCM
 * using a 256-bit key derived from one of three sources, in order:
 *
 *  1. `passphrase` argument (in-memory)
 *  2. `REXA_VAULT_KEY` env var
 *  3. Machine-derived fallback (PBKDF2 over hostname + machine-id), with a
 *     warning logged so users know the at-rest key is not secret.
 *
 * Future: pull from OS keychain (libsecret / Keychain / DPAPI) — see
 * `docs/guides/secret-vault.md`.
 */
export class SecretVault {
  private readonly storage: JsonStorage;
  private readonly key: Buffer;
  private readonly source: VaultStatus["source"];
  private readonly storagePath: string;
  private warned = false;

  constructor(path = "data/vault.json", passphrase?: string) {
    this.storagePath = path;
    this.storage = new JsonStorage(path);
    if (passphrase && passphrase.length > 0) {
      this.key = createHash("sha256").update(passphrase).digest();
      this.source = "passphrase";
    } else if (process.env.REXA_VAULT_KEY) {
      this.key = createHash("sha256").update(process.env.REXA_VAULT_KEY).digest();
      this.source = "rexa-vault-key";
    } else {
      this.key = deriveMachineKey();
      this.source = "machine-derived";
      this.warn();
    }
  }

  status(): VaultStatus {
    return { path: this.storagePath, source: this.source, warned: this.warned };
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

  async listIds(): Promise<string[]> {
    const records = await this.storage.query<{ id: string }>("secrets");
    return records.map((record) => record.id).filter(Boolean);
  }

  async deleteSecret(id: string): Promise<void> {
    await this.storage.delete("secrets", id);
  }

  private warn(): void {
    if (this.warned) return;
    this.warned = true;
    logger.warn(
      "[secret-vault] using machine-derived fallback key. Set REXA_VAULT_KEY or pass a passphrase to harden at-rest encryption.",
    );
  }
}

function deriveMachineKey(): Buffer {
  const machineId = (() => {
    try {
      if (existsSync("/etc/machine-id")) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require("node:fs").readFileSync("/etc/machine-id", "utf8").trim();
      }
    } catch {
      /* ignore */
    }
    return "";
  })();
  const hostname = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("node:os").hostname();
    } catch {
      return "rexa";
    }
  })();
  return pbkdf2Sync(`${machineId}:${hostname}`, "rexa-vault-salt", 100_000, 32, "sha256");
}
