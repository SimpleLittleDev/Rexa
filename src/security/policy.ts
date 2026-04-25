export const RexaSafetyPolicy = {
  never: [
    "Ask users for raw account passwords",
    "Bypass captcha or two factor authentication",
    "Send email or publish public content without confirmation",
    "Store plain text credentials or OAuth refresh tokens in logs",
    "Run destructive commands without confirmation",
  ],
  confirmationRequired: [
    "file.delete",
    "terminal.dangerous",
    "browser.publish",
    "gmail.send",
    "calendar.write",
  ],
} as const;
