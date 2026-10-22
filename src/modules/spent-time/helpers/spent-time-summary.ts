import type { RedmineTimeEntry } from "@/modules/redmine/schemas/time-entry-response";
import type { SpentTimePeriod } from "@/modules/spent-time/schemas/spent-time-report";

const DAY_MS = 86_400_000;
const decimalHours = (hours: number) => Number(hours.toFixed(10));

function dateAt(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function trendPeriod(dayCount: number): SpentTimePeriod {
  return dayCount <= 31 ? "daily" : dayCount <= 366 ? "weekly" : "monthly";
}

function bucketStart(date: Date, period: SpentTimePeriod) {
  if (period === "monthly") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  if (period === "weekly") {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    return new Date(date.getTime() - mondayOffset * DAY_MS);
  }
  return date;
}

function nextBucket(date: Date, period: SpentTimePeriod) {
  if (period === "monthly")
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return new Date(date.getTime() + (period === "weekly" ? 7 : 1) * DAY_MS);
}

function addChoiceHours(entries: RedmineTimeEntry[], key: "project" | "activity") {
  const groups = new Map<number, { id: number; name: string; hours: number }>();
  for (const entry of entries) {
    const choice = entry[key];
    const group = groups.get(choice.id) ?? { ...choice, hours: 0 };
    group.hours += entry.hours;
    groups.set(choice.id, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, hours: decimalHours(group.hours) }))
    .sort((left, right) => right.hours - left.hours || left.name.localeCompare(right.name));
}

export function getSpentTimeChoices(entries: RedmineTimeEntry[]) {
  const choices = (key: "project" | "activity") =>
    [...new Map(entries.map((entry) => [entry[key].id, entry[key]])).values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  return { projects: choices("project"), activities: choices("activity") };
}

export function summarizeSpentTime(
  entries: RedmineTimeEntry[],
  range: { from: string; to: string },
) {
  const fromDate = dateAt(range.from);
  const toDate = dateAt(range.to);
  const dayCount = Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
  const period = trendPeriod(dayCount);
  const buckets = new Map<string, number>();

  for (
    let bucket = bucketStart(fromDate, period);
    bucket <= toDate;
    bucket = nextBucket(bucket, period)
  ) {
    buckets.set(dateString(bucket), 0);
  }
  for (const entry of entries) {
    const key = dateString(bucketStart(dateAt(entry.spentOn), period));
    buckets.set(key, (buckets.get(key) ?? 0) + entry.hours);
  }

  return {
    totalHours: decimalHours(entries.reduce((sum, entry) => sum + entry.hours, 0)),
    trend: {
      period,
      buckets: [...buckets].map(([period, hours]) => ({ period, hours: decimalHours(hours) })),
    },
    distribution: {
      projects: addChoiceHours(entries, "project"),
      activities: addChoiceHours(entries, "activity"),
    },
  };
}
