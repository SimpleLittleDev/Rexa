import type { ToolPlugin } from "./tool-plugin.interface";

export class PluginRegistry {
  private readonly plugins = new Map<string, ToolPlugin>();

  register(plugin: ToolPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  get(name: string): ToolPlugin | undefined {
    return this.plugins.get(name);
  }

  list(): ToolPlugin[] {
    return [...this.plugins.values()];
  }
}
