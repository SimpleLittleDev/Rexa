export const collections = [
  "users",
  "sessions",
  "tasks",
  "task_states",
  "messages",
  "memory",
  "subagent_results",
  "tool_logs",
  "confirmations",
  "provider_config",
  "environment_capability_cache",
  "audit_logs",
] as const;

export type RexaCollection = (typeof collections)[number];
