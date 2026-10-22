"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";

import type { IssueFilterCriterion } from "@/modules/issues/helpers/issue-filter-options";
import { buildIssueListUrl } from "@/modules/issues/helpers/issue-list-query";
import type { RedmineIssuePage } from "@/modules/redmine/helpers/redmine-api";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

export async function fetchIssues(url: string): Promise<RedmineIssuePage> {
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
  const { data, error, isLoading, isValidating, mutate } = useSWR<RedmineIssuePage, AppApiError>(
    key,
    fetchIssues,
  );
  return { data, error, isLoading, isValidating, refresh: mutate };
}

export function useRefreshIssues() {
  const { cache, mutate } = useSWRConfig();
  return useCallback(() => {
    // SWR predicate mutations skip the aggregate keys used by infinite queries.
    const boardPrefix = unstable_serialize(() => "/api/issues?");
    const keys = [...cache.keys()].filter(
      (key) => key.startsWith("/api/issues?") || key.startsWith(boardPrefix),
    );
    return Promise.all(
      keys.map((key) => mutate(key, undefined, { revalidate: true, throwOnError: false })),
    );
  }, [cache, mutate]);
}
