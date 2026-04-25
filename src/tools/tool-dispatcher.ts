import type { LLMMessage, LLMRequest, LLMResponse, LLMToolCall, LLMToolDefinition } from "../llm/llm-provider.interface";
import { logger } from "../logs/logger";

export interface ToolHandler {
  definition: LLMToolDefinition;
  execute: (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<unknown>;
}

export interface ToolExecutionContext {
  taskId?: string;
  userId?: string;
  signal?: AbortSignal;
}

export interface ToolCallLoopOptions {
  maxIterations?: number;
  ctx?: ToolExecutionContext;
  onIteration?: (iteration: number, response: LLMResponse) => void | Promise<void>;
  onToolCall?: (call: LLMToolCall, result: unknown) => void | Promise<void>;
}

/**
 * Tool dispatcher + multi-turn tool-calling loop.
 *
 * The orchestrator hands the dispatcher an LLM `generate` function plus the
 * initial request. We invoke the model, execute any tool calls it returns,
 * append the tool results back into the message thread, and re-invoke the
 * model — up to `maxIterations` times. The final assistant text wins.
 */
export class ToolDispatcher {
  private readonly handlers = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void {
    this.handlers.set(handler.definition.name, handler);
  }

  registerMany(handlers: ToolHandler[]): void {
    for (const handler of handlers) this.register(handler);
  }

  definitions(): LLMToolDefinition[] {
    return Array.from(this.handlers.values()).map((handler) => handler.definition);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  async run(name: string, args: Record<string, unknown>, ctx: ToolExecutionContext = {}): Promise<unknown> {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`Tool not registered: ${name}`);
    return handler.execute(args, ctx);
  }

  /**
   * Drive a model → tool → model loop until the assistant emits a final
   * answer (no further `tool_calls`) or `maxIterations` is reached.
   */
  async loop(
    generate: (input: LLMRequest) => Promise<LLMResponse>,
    initial: LLMRequest,
    options: ToolCallLoopOptions = {},
  ): Promise<LLMResponse> {
    const maxIterations = options.maxIterations ?? 6;
    const messages: LLMMessage[] = [...initial.messages];
    const tools = initial.tools ?? this.definitions();
    let last: LLMResponse | null = null;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const response = await generate({ ...initial, messages, tools });
      last = response;
      await options.onIteration?.(iteration, response);

      if (!response.toolCalls || response.toolCalls.length === 0) {
        return response;
      }

      messages.push({ role: "assistant", content: response.text });
      for (const call of response.toolCalls) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = call.arguments ? (JSON.parse(call.arguments) as Record<string, unknown>) : {};
        } catch {
          // Some providers stream malformed JSON deltas — pass the raw string through.
          parsed = { raw: call.arguments };
        }
        let result: unknown;
        try {
          result = await this.run(call.name, parsed, options.ctx ?? {});
        } catch (error) {
          result = { error: error instanceof Error ? error.message : String(error) };
          logger.warn("[tool-dispatcher] tool failed", { name: call.name, message: String(result) });
        }
        await options.onToolCall?.(call, result);
        messages.push({
          role: "tool",
          name: call.name,
          toolCallId: call.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        });
      }
    }
    if (!last) throw new Error("Tool loop produced no response");
    return last;
  }
}
