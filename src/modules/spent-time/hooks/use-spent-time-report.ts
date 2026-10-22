"use client";

import useSWR from "swr";

import {
  type SpentTimeQuery,
  type SpentTimeReport,
  spentTimeReportSchema,
} from "@/modules/spent-time/schemas/spent-time-report";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

async function fetchReport(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw await readApiError(response, "spent_time_load_failed");
  const parsed = spentTimeReportSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new AppApiError("spent_time_load_failed", 502);
  return parsed.data;
}

export function buildSpentTimeUrl(query: SpentTimeQuery) {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.projectId) params.set("projectId", String(query.projectId));
  if (query.activityId) params.set("activityId", String(query.activityId));
  return `/api/spent-time?${params}`;
}

export function useSpentTimeReport(query: SpentTimeQuery) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<SpentTimeReport, AppApiError>(
    buildSpentTimeUrl(query),
    fetchReport,
  );
  return { data, error, isLoading, isValidating, refresh: mutate };
}
