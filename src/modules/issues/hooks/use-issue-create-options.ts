"use client";

import useSWR from "swr";

import type { IssueCreateOptions, ProjectChoice } from "@/modules/issues/schemas/issue-creation";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

type ProjectResponse = { projects: ProjectChoice[] };

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new AppApiError("create_options_failed", 0);
  }
  if (!response.ok) {
    throw await readApiError(response, "create_options_failed");
  }
  return response.json();
}

export function useIssueCreateOptions(projectId: number, enabled = true) {
  const projectQuery = useSWR<ProjectResponse, AppApiError>(
    enabled ? "/api/issues/create-options" : null,
    getJson,
  );
  const optionsQuery = useSWR<IssueCreateOptions, AppApiError>(
    enabled && projectId > 0 ? `/api/issues/create-options?projectId=${projectId}` : null,
    getJson,
  );
  return {
    projects: projectQuery.data?.projects ?? [],
    projectsError: projectQuery.error,
    options: optionsQuery.data,
    optionsError: optionsQuery.error,
    isLoading: projectQuery.isLoading || optionsQuery.isLoading,
    isValidating: projectQuery.isValidating || optionsQuery.isValidating,
    retryOptions: () => {
      void projectQuery.mutate();
      void optionsQuery.mutate();
    },
  };
}
