export type RiskLevel = "low" | "medium" | "high";

export interface RiskAssessment {
  level: RiskLevel;
  requiresConfirmation: boolean;
  reasons: string[];
}

const dangerousPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+(-[^\s]*r|-r|-rf|-fr)/, reason: "Recursive delete command" },
  { pattern: /\bchmod\s+(-R\s+)?777\b/, reason: "Broad permission change" },
  { pattern: /\bchown\s+(-R\s+)?/, reason: "Ownership change" },
  { pattern: /\bdd\s+if=/, reason: "Raw disk write/read command" },
  { pattern: />\s*\/(etc|usr|bin|sbin|system)\b/, reason: "Writes into protected system path" },
  { pattern: /\bnpm\s+install\s+-g\b/, reason: "Global package installation" },
  { pattern: /\bcurl\b.*\|\s*(sh|bash|zsh)/, reason: "Remote script execution" },
];

export class RiskEngine {
  assessCommand(command: string): RiskAssessment {
    const reasons = dangerousPatterns
      .filter((entry) => entry.pattern.test(command))
      .map((entry) => entry.reason);

    if (reasons.length > 0) {
      return { level: "high", requiresConfirmation: true, reasons };
    }

    if (/\b(npm|pnpm|yarn|bun)\s+install\b/.test(command)) {
      return {
        level: "medium",
        requiresConfirmation: false,
        reasons: ["Installs project dependencies"],
      };
    }

    return { level: "low", requiresConfirmation: false, reasons: [] };
  }
}
