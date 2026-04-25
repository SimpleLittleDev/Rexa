import type { SubAgentResult } from "../subagents/subagent";

export interface ValidationResult {
  valid: boolean;
  risks: string[];
  recommendedNextStep: string;
}

export class Validator {
  validateSubAgentResult(result: SubAgentResult): ValidationResult {
    const risks = [...result.risks];
    if (result.needsUserConfirmation) risks.push("Sub-agent requested user confirmation");
    if (result.filesChanged.length > 0) risks.push("Sub-agent changed files; run tests or inspect diff");
    return {
      valid: result.status === "completed" && risks.length === 0,
      risks,
      recommendedNextStep: risks.length > 0 ? "Review sub-agent output before continuing" : result.recommendedNextStep,
    };
  }
}
