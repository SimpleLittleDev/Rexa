import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { TelemetryConfig } from "../app/config";

export interface TelemetryEvent {
  timestamp: string;
  provider: string;
  model?: string;
  role?: string;
  intent?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  success: boolean;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface TelemetrySummary {
  totalEvents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  firstAt: string | null;
  lastAt: string | null;
  byProvider: Record<string, { events: number; costUsd: number; tokens: number }>;
  byRole: Record<string, { events: number; costUsd: number; tokens: number }>;
}

/**
 * NDJSON telemetry log.
 *
 * Append-only by design — each line is a single self-describing JSON object.
 * `summary()` is a streaming reducer so the file can grow large without
 * blowing memory. Disable globally via `app.telemetry.enabled = false` or
 * `REXA_TELEMETRY=off`.
 */
export class Telemetry {
  constructor(private readonly config: TelemetryConfig) {}

  async record(event: Omit<TelemetryEvent, "timestamp"> & { timestamp?: string }): Promise<void> {
    if (!this.config.enabled) return;
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
    await mkdir(dirname(this.config.logPath), { recursive: true });
    await appendFile(this.config.logPath, JSON.stringify(fullEvent) + "\n", "utf8");
  }

  async summary(): Promise<TelemetrySummary> {
    const summary: TelemetrySummary = {
      totalEvents: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      firstAt: null,
      lastAt: null,
      byProvider: {},
      byRole: {},
    };

    let raw: string;
    try {
      raw = await readFile(this.config.logPath, "utf8");
    } catch {
      return summary;
    }

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed) as TelemetryEvent;
        summary.totalEvents += 1;
        summary.totalInputTokens += event.inputTokens ?? 0;
        summary.totalOutputTokens += event.outputTokens ?? 0;
        summary.totalCostUsd += event.costUsd ?? 0;
        summary.firstAt = summary.firstAt ?? event.timestamp;
        summary.lastAt = event.timestamp;

        const providerKey = event.provider ?? "unknown";
        const providerStats = summary.byProvider[providerKey] ?? { events: 0, costUsd: 0, tokens: 0 };
        providerStats.events += 1;
        providerStats.costUsd += event.costUsd ?? 0;
        providerStats.tokens += (event.inputTokens ?? 0) + (event.outputTokens ?? 0);
        summary.byProvider[providerKey] = providerStats;

        const roleKey = event.role ?? "unknown";
        const roleStats = summary.byRole[roleKey] ?? { events: 0, costUsd: 0, tokens: 0 };
        roleStats.events += 1;
        roleStats.costUsd += event.costUsd ?? 0;
        roleStats.tokens += (event.inputTokens ?? 0) + (event.outputTokens ?? 0);
        summary.byRole[roleKey] = roleStats;
      } catch {
        // ignore malformed lines
      }
    }
    return summary;
  }
}
