"use client";

import useSWR from "swr";

import type { IssueFilterOption } from "@/modules/issues/helpers/issue-filter-options";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

type IssueFilterOptions = { fields: IssueFilterOption[]; instance: string };

async function fetchIssueFilters(url: string): Promise<IssueFilterOptions> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new AppApiError("filters_load_failed", 0);
  }
  if (!response.ok) throw await readApiError(response, "filters_load_failed");
  return response.json();
}

export function useIssueFilters() {
  const { data, error, mutate } = useSWR<IssueFilterOptions, AppApiError>(
    "/api/issues/filters",
    fetchIssueFilters,
  );
  return { data, error, refresh: mutate };
}
