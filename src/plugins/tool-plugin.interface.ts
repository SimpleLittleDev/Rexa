import type { ToolResult } from "../common/result";
import type { Permission } from "../security/permissions";

export interface ToolAction {
  name: string;
  input: Record<string, unknown>;
  confirmed?: boolean;
}

export interface ToolPlugin {
  name: string;
  description: string;
  permissions: Permission[];
  isAvailable(): Promise<boolean>;
  execute(action: ToolAction): Promise<ToolResult>;
}
