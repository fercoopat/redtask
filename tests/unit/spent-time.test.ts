import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { getRedmineTimeEntries } from "../../src/modules/redmine/helpers/redmine-api";
import { getCurrentMonthRange } from "../../src/modules/spent-time/helpers/spent-time-query";
import { summarizeSpentTime } from "../../src/modules/spent-time/helpers/spent-time-summary";

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.REDMINE_BASE_URL;
const originalPassword = process.env.IRON_SESSION_PASSWORD;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBaseUrl) process.env.REDMINE_BASE_URL = originalBaseUrl;
  else delete process.env.REDMINE_BASE_URL;
  if (originalPassword) process.env.IRON_SESSION_PASSWORD = originalPassword;
  else delete process.env.IRON_SESSION_PASSWORD;
});

function entry(id: number, spent_on: string, hours: number) {
  return {
    id,
    spent_on,
    hours,
    project: { id: 10, name: "Project" },
    activity: { id: 20, name: "Development" },
  };
}

test("time-entry reader fetches every page for the session user and date range", async () => {
  process.env.REDMINE_BASE_URL = "https://redmine.synthetic.test";
  process.env.IRON_SESSION_PASSWORD = "synthetic-test-secret-at-least-32-characters";
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    assert.equal(options?.cache, "no-store");
    const offset = new URL(String(url)).searchParams.get("offset");
    return Response.json({
      time_entries: offset === "0" ? [entry(1, "2026-10-01", 1.5)] : [entry(2, "2026-10-02", 2)],
      total_count: 2,
      offset: Number(offset),
      limit: 1,
    });
  };

  const result = await getRedmineTimeEntries("secret", 7, { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(
    result.map(({ id }) => id),
    [1, 2],
  );
  assert.equal(calls.length, 2);
  assert.ok(
    calls.every(
      (url) =>
        url.includes("user_id=7") &&
        url.includes("from=2026-10-01") &&
        url.includes("to=2026-10-31"),
    ),
  );
});

test("summary aggregates decimal hours and selects daily, Monday-weekly, and monthly buckets", () => {
  const entries = [
    {
      id: 1,
      spentOn: "2026-10-01",
      hours: 1.5,
      project: { id: 1, name: "A" },
      activity: { id: 1, name: "Dev" },
    },
    {
      id: 2,
      spentOn: "2026-10-02",
      hours: 2,
      project: { id: 2, name: "B" },
      activity: { id: 1, name: "Dev" },
    },
  ];
  const daily = summarizeSpentTime(entries, { from: "2026-10-01", to: "2026-10-02" });
  assert.equal(daily.totalHours, 3.5);
  assert.equal(daily.trend.period, "daily");
  assert.equal(daily.distribution.projects.length, 2);
  assert.equal(
    summarizeSpentTime(entries, { from: "2026-10-01", to: "2026-11-01" }).trend.period,
    "weekly",
  );
  const weekly = summarizeSpentTime(entries, { from: "2026-10-01", to: "2026-11-01" });
  assert.equal(weekly.trend.buckets[0].period, "2026-09-28");
  assert.equal(
    summarizeSpentTime(entries, { from: "2025-01-01", to: "2026-10-02" }).trend.period,
    "monthly",
  );
});

test("current-month range follows the configured time zone", () => {
  const range = getCurrentMonthRange("America/Los_Angeles", new Date("2026-11-01T01:00:00Z"));
  assert.deepEqual(range, { from: "2026-10-01", to: "2026-10-31" });
});
