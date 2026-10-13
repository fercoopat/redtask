"use client";

import useSWR from "swr";

import type { IssueFilterCriterion } from "@/modules/issues/helpers/issue-filter-options";
import { buildIssueListUrl } from "@/modules/issues/helpers/issue-list-query";
import type { RedmineIssuePage } from "@/modules/redmine/helpers/redmine-api";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

async function fetchIssues(url: string): Promise<RedmineIssuePage> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new AppApiError("issues_load_failed", 0);
  }
  if (!response.ok) throw await readApiError(response, "issues_load_failed");
  return response.json();
}

export function useIssuesList(
  page: number,
  pageSize: number,
  filters: IssueFilterCriterion[],
  enabled: boolean,
) {
  const key = enabled ? buildIssueListUrl(page, pageSize, filters) : null;
  const { data, error, isLoading, mutate } = useSWR<RedmineIssuePage, AppApiError>(
    key,
    fetchIssues,
  );
  return { data, error, isLoading, refresh: mutate };
}
