export type TaskStatus =
  | "pending"
  | "planning"
  | "waiting_confirmation"
  | "running"
  | "blocked"
  | "failed"
  | "completed"
  | "cancelled";

export interface TaskState {
  taskId: string;
  userId: string;
  status: TaskStatus;
  currentStep: number;
  plan: string[];
  selectedTools: string[];
  selectedModels: string[];
  subagents: string[];
  logs: string[];
  confirmations: string[];
  result?: string;
}

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  pending: ["planning", "cancelled"],
  planning: ["running", "waiting_confirmation", "blocked", "failed", "cancelled"],
  waiting_confirmation: ["running", "cancelled", "blocked"],
  running: ["waiting_confirmation", "blocked", "failed", "completed", "cancelled"],
  blocked: ["running", "failed", "cancelled"],
  failed: ["planning", "cancelled"],
  completed: [],
  cancelled: [],
};

export class TaskStateMachine {
  constructor(private state: TaskState) {}

  transition(next: TaskStatus): void {
    if (!allowedTransitions[this.state.status].includes(next)) {
      throw new Error(`Invalid task transition ${this.state.status} -> ${next}`);
    }
    this.state = { ...this.state, status: next };
  }

  setPlan(plan: string[]): void {
    this.state = { ...this.state, plan };
  }

  setResult(result: string): void {
    this.state = { ...this.state, result };
  }

  advanceStep(): void {
    this.state = { ...this.state, currentStep: this.state.currentStep + 1 };
  }

  log(message: string): void {
    this.state = { ...this.state, logs: [...this.state.logs, message] };
  }

  snapshot(): TaskState {
    return structuredClone(this.state);
  }
}
