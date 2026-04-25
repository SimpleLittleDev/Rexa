/**
 * Tiny cron-expression parser. Supports the standard 5-field format
 * (`minute hour day-of-month month day-of-week`) plus `*`, `*\/N`, `A,B,C`,
 * `A-B`, and named months/days. Sufficient for daemon scheduling without
 * pulling a native cron library.
 */

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface CronExpr {
  minute: Set<number>;
  hour: Set<number>;
  dayOfMonth: Set<number>;
  month: Set<number>;
  dayOfWeek: Set<number>;
}

export function parseCron(expression: string): CronExpr {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Cron expression must have 5 fields, got ${parts.length}`);
  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dayOfMonth: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12, MONTH_NAMES),
    dayOfWeek: parseField(parts[4], 0, 6, DAY_NAMES),
  };
}

function parseField(field: string, min: number, max: number, names?: string[]): Set<number> {
  const out = new Set<number>();
  for (const segment of field.split(",")) {
    const stepIndex = segment.indexOf("/");
    const range = stepIndex === -1 ? segment : segment.slice(0, stepIndex);
    const step = stepIndex === -1 ? 1 : Number(segment.slice(stepIndex + 1));
    if (!Number.isFinite(step) || step <= 0) throw new Error(`Invalid step in cron: ${segment}`);

    let lo = min;
    let hi = max;
    if (range !== "*") {
      const dashIndex = range.indexOf("-");
      if (dashIndex === -1) {
        const value = parseSingle(range, names);
        lo = value;
        hi = value;
      } else {
        lo = parseSingle(range.slice(0, dashIndex), names);
        hi = parseSingle(range.slice(dashIndex + 1), names);
      }
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

function parseSingle(token: string, names?: string[]): number {
  const lower = token.toLowerCase();
  if (names) {
    const idx = names.indexOf(lower);
    if (idx !== -1) return idx + (names === MONTH_NAMES ? 1 : 0);
  }
  const n = Number(token);
  if (!Number.isFinite(n)) throw new Error(`Invalid cron token: ${token}`);
  return n;
}

/**
 * Find the next datetime (ms epoch) after `from` matching `expr`.
 * Bounded search: gives up after one year to avoid infinite loops.
 */
export function nextRun(expr: CronExpr, from: Date = new Date()): Date | null {
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  for (let i = 0; i < 366 * 24 * 60; i += 1) {
    if (
      expr.minute.has(cursor.getMinutes()) &&
      expr.hour.has(cursor.getHours()) &&
      expr.dayOfMonth.has(cursor.getDate()) &&
      expr.month.has(cursor.getMonth() + 1) &&
      expr.dayOfWeek.has(cursor.getDay())
    ) {
      return cursor;
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return null;
}
