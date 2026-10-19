const UK = "Europe/London";

export type Range = "this-month" | "last-month" | "all";

export const RANGE_LABELS: Record<Range, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  all: "All time",
};

/**
 * The instant UK midnight on the 1st happens, `offset` months from the current
 * UK month (0 = this month, -1 = last month, 1 = next month). Perk limits reset
 * on UK time, so the log filters on the same boundaries.
 */
export function ukMonthStart(offset: number): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK,
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const utcMidnight = new Date(Date.UTC(year, month - 1 + offset, 1));
  // UK is UTC+0 or UTC+1, so its clock reads 00 or 01 at UTC midnight.
  const ukHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: UK, hour: "numeric", hourCycle: "h23" }).format(
      utcMidnight,
    ),
  );
  return new Date(utcMidnight.getTime() - ukHour * 3_600_000);
}

export function rangeParams(range: Range): { from?: string; to?: string } {
  if (range === "this-month") return { from: ukMonthStart(0).toISOString() };
  if (range === "last-month") {
    return { from: ukMonthStart(-1).toISOString(), to: ukMonthStart(0).toISOString() };
  }
  return {};
}

export function formatUk(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: UK,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
