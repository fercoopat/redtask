"use client";

import useSWRInfinite from "swr/infinite";

import { buildIssueListUrl } from "@/modules/issues/helpers/issue-list-query";
import { fetchIssues } from "@/modules/issues/hooks/use-issues-list";
import type { RedmineIssuePage } from "@/modules/redmine/helpers/redmine-api";
import type { AppApiError } from "@/shared/errors/api-error";

export function useIssueBoardColumn(projectId: number, statusId: number) {
  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<
    RedmineIssuePage,
    AppApiError
  >(
    (index, previous: RedmineIssuePage | null) => {
      if (previous && previous.offset + previous.issues.length >= previous.totalCount) return null;
      return buildIssueListUrl(index + 1, 25, [
        { field: "project_id", operator: "=", value: String(projectId) },
        { field: "status_id", operator: "=", value: String(statusId) },
      ]);
    },
    fetchIssues,
    { revalidateAll: true },
  );
  const issues = [
    ...new Map(
      (data ?? []).flatMap((page) => page.issues).map((issue) => [issue.id, issue]),
    ).values(),
  ];
  const total = data?.[0]?.totalCount ?? 0;
  return {
    issues,
    total,
    error,
    isLoading,
    isValidating,
    hasMore: issues.length < total,
    loadMore: () => setSize(size + 1),
    refresh: mutate,
  };
}
