import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface AuditEvent {
  userId: string;
  taskId: string;
  event: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogOptions {
  filePath?: string;
  silent?: boolean;
}

export class AuditLog {
  private readonly filePath: string;
  private readonly silent: boolean;

  constructor(options: AuditLogOptions = {}) {
    this.filePath = options.filePath ?? join(process.cwd(), "logs", "audit.log");
    this.silent = options.silent ?? false;
  }

  async record(event: AuditEvent): Promise<void> {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...event });
    if (this.silent) return;
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await appendFile(this.filePath, `${line}\n`, "utf8");
    } catch {
      // Audit log is best-effort; never break the runtime if disk is read-only.
    }
  }
}
