export type IntentType = "coding" | "browser" | "file" | "terminal" | "research" | "general";

export interface Intent {
  type: IntentType;
  needsSubAgent: boolean;
  risk: "low" | "medium" | "high";
}

export interface TaskPlan {
  intent: Intent;
  steps: string[];
  recommendedRole: "main" | "coding" | "browser" | "cheap";
}

export class Planner {
  createPlan(message: string): TaskPlan {
    const lower = message.toLowerCase();
    const coding = /(code|coding|refactor|bug|typescript|javascript|project|test|build|file)/.test(lower);
    const browser = /(browser|chromium|website|click|screenshot|form|url|buka|bukain|youtube|google|search|cari|web\b|situs|halaman)/.test(lower);
    const terminal = /(run|install|command|terminal|npm|git)/.test(lower);
    const destructive = /(delete|hapus|rm -rf|publish|send email|transfer|buy)/.test(lower);
    const complex = message.length > 240 || /(besar|kompleks|large|full|multi|sub-agent|worker)/.test(lower);

    if (coding) {
      return {
        intent: { type: "coding", needsSubAgent: complex, risk: destructive ? "high" : terminal ? "medium" : "low" },
        recommendedRole: "coding",
        steps: ["Understand request", "Retrieve memory", "Select coding model", "Inspect relevant files", "Implement or delegate", "Validate result", "Report"],
      };
    }

    if (browser) {
      return {
        intent: { type: "browser", needsSubAgent: complex, risk: destructive ? "high" : "medium" },
        recommendedRole: "browser",
        steps: ["Open browser context", "Inspect page", "Draft actions", "Confirm risky actions", "Execute", "Capture evidence", "Report"],
      };
    }

    return {
      intent: { type: terminal ? "terminal" : "general", needsSubAgent: false, risk: destructive ? "high" : "low" },
      recommendedRole: "main",
      steps: ["Understand request", "Retrieve memory", "Plan", "Execute safe steps", "Report"],
    };
  }
}
