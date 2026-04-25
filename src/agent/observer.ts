import { AuditLog } from "../logs/audit-log";

export class Observer {
  constructor(private readonly audit = new AuditLog()) {}

  progress(userId: string, taskId: string, message: string): Promise<void> {
    return this.audit.record({ userId, taskId, event: "progress", status: message });
  }
}
