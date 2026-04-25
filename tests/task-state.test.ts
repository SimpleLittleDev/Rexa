import { describe, expect, test } from "vitest";
import { TaskStateMachine } from "../src/agent/task-state";

describe("TaskStateMachine", () => {
  test("allows resumable task state transitions", () => {
    const machine = new TaskStateMachine({
      taskId: "task_1",
      userId: "local",
      status: "pending",
      currentStep: 0,
      plan: [],
      selectedTools: [],
  selectedModels: [],
      subagents: [],
      logs: [],
      confirmations: [],
    });

    machine.transition("planning");
    machine.setPlan(["inspect", "execute"]);
    machine.transition("running");

    expect(machine.snapshot()).toMatchObject({
      status: "running",
      currentStep: 0,
      plan: ["inspect", "execute"],
    });
  });
});
