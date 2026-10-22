import {
  type SpentTimeQuery,
  spentTimeQuerySchema,
} from "@/modules/spent-time/schemas/spent-time-report";

const queryKeys = new Set(["from", "to", "projectId", "activityId", "page", "pageSize"]);

export function parseSpentTimeQuery(params: URLSearchParams): SpentTimeQuery | null {
  const values: Record<string, string> = {};
  for (const [key, value] of params) {
    if (!queryKeys.has(key) || Object.hasOwn(values, key)) return null;
    values[key] = value;
  }
  const result = spentTimeQuerySchema.safeParse(values);
  return result.success ? result.data : null;
}

export function getCurrentMonthRange(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const monthText = String(month).padStart(2, "0");

  return {
    from: `${year}-${monthText}-01`,
    to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}
