export interface ConfirmationRequest {
  userId: string;
  action: string;
  impact: string;
  dataUsed: string[];
  command?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfirmationDecision {
  request: ConfirmationRequest;
  approved: boolean;
  status: "approved" | "rejected";
  decidedAt: string;
}

export type ConfirmationHandler = (request: ConfirmationRequest) => Promise<boolean>;

export class ConfirmationGate {
  constructor(private readonly handler: ConfirmationHandler) {}

  async request(request: ConfirmationRequest): Promise<ConfirmationDecision> {
    const approved = await this.handler(request);
    return {
      request,
      approved,
      status: approved ? "approved" : "rejected",
      decidedAt: new Date().toISOString(),
    };
  }
}
