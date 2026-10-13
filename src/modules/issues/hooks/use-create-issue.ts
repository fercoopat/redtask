"use client";

import useSWRMutation from "swr/mutation";

import type { CreatedIssue, IssueDraftOutput } from "@/modules/issues/schemas/issue-creation";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

async function postIssue(_url: string, { arg }: { arg: IssueDraftOutput }) {
  let response: Response;
  try {
    response = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arg),
    });
  } catch {
    throw new AppApiError("issue_create_unknown", 0);
  }
  if (!response.ok) {
    throw await readApiError(response, "issue_create_unknown");
  }
  return (await response.json()) as { issue: CreatedIssue };
}

export function useCreateIssue() {
  const { trigger, isMutating, error, reset } = useSWRMutation<
    { issue: CreatedIssue },
    AppApiError,
    string,
    IssueDraftOutput
  >("/api/issues", postIssue);
  return {
    createIssue: (draft: IssueDraftOutput) => trigger(draft, { throwOnError: true }),
    isCreating: isMutating,
    reset,
    error,
    errorDetails: error?.details ?? [],
  };
}
