export type PermissionMode = "safe" | "balanced" | "power-user";

export type Permission =
  | "browser.read"
  | "browser.write"
  | "browser.publish"
  | "terminal.read"
  | "terminal.execute"
  | "terminal.dangerous"
  | "file.read"
  | "file.write"
  | "file.delete"
  | "gmail.read"
  | "gmail.draft"
  | "gmail.send"
  | "calendar.read"
  | "calendar.write"
  | "memory.read"
  | "memory.write"
  | "subagent.create"
  | "storage.read"
  | "storage.write";

export interface PermissionDecision {
  allowed: boolean;
  needsConfirmation: boolean;
  reason: string;
}

const destructivePermissions = new Set<Permission>([
  "browser.publish",
  "terminal.dangerous",
  "file.delete",
  "gmail.send",
]);

const writePermissions = new Set<Permission>([
  "browser.write",
  "terminal.execute",
  "file.write",
  "gmail.draft",
  "calendar.write",
  "memory.write",
  "storage.write",
  "subagent.create",
]);

export class PermissionManager {
  constructor(private readonly mode: PermissionMode = "safe") {}

  evaluate(permission: Permission): PermissionDecision {
    if (destructivePermissions.has(permission)) {
      return {
        allowed: false,
        needsConfirmation: true,
        reason: `${permission} is destructive or public and requires confirmation`,
      };
    }

    if (this.mode === "safe" && writePermissions.has(permission)) {
      return {
        allowed: false,
        needsConfirmation: true,
        reason: `${permission} requires confirmation in safe mode`,
      };
    }

    return { allowed: true, needsConfirmation: false, reason: "Allowed by current permission mode" };
  }

  assert(permission: Permission): void {
    const decision = this.evaluate(permission);
    if (!decision.allowed) {
      throw new Error(decision.reason);
    }
  }
}
