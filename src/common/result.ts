export interface RexaError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestedFallback?: string;
}

export type ResultMetadata = Record<string, unknown>;

export type ToolResult<T = unknown> =
  | {
      success: true;
      data: T;
      error: null;
      metadata: ResultMetadata;
    }
  | {
      success: false;
      data: null;
      error: RexaError;
      metadata: ResultMetadata;
    };

export function ok<T>(data: T, metadata: ResultMetadata = {}): ToolResult<T> {
  return { success: true, data, error: null, metadata };
}

export function fail<T = never>(
  code: string,
  message: string,
  options: { recoverable?: boolean; suggestedFallback?: string; metadata?: ResultMetadata } = {},
): ToolResult<T> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      recoverable: options.recoverable ?? true,
      suggestedFallback: options.suggestedFallback,
    },
    metadata: options.metadata ?? {},
  };
}

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}
