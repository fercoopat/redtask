"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import { useSessionLifecycle } from "@/modules/auth/hooks/use-session-lifecycle";
import { useRefreshIssues } from "@/modules/issues/hooks/use-issues-list";
import {
  type IssueStatusChange,
  type IssueStatusInfo,
  issueStatusInfoSchema,
} from "@/modules/issues/schemas/issue-status";
import type { RedmineIssueSummary } from "@/modules/redmine/helpers/redmine-api";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

async function readIssueStatus(url: string): Promise<IssueStatusInfo> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new AppApiError("redmine_unavailable", 0);
  }
  if (!response.ok) throw await readApiError(response, "redmine_unexpected");
  const payload = await response.json().catch(() => null);
  const parsed = issueStatusInfoSchema.safeParse(payload?.issue);
  if (!parsed.success) throw new AppApiError("redmine_unexpected", 502);
  return parsed.data;
}

async function moveIssue(_url: string, { arg }: { arg: IssueStatusChange & { id: number } }) {
  let response: Response;
  try {
    response = await fetch(`/api/issues/${arg.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId: arg.statusId, expectedStatusId: arg.expectedStatusId }),
    });
  } catch {
    throw new AppApiError("issue_status_unknown", 0);
  }
  if (!response.ok) throw await readApiError(response, "issue_status_unknown");
  const payload = await response.json().catch(() => null);
  const parsed = issueStatusInfoSchema.safeParse(payload?.issue);
  if (!parsed.success || parsed.data.statusId !== arg.statusId)
    throw new AppApiError("issue_status_unknown", 502);
  return parsed.data;
}

export function useIssueBoardActions() {
  const [selected, setSelected] = useState<RedmineIssueSummary | null>(null);
  const [failure, setFailure] = useState<AppApiError | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState<{ status?: string } | null>(null);
  const locked = useRef(false);
  const { endSession } = useSessionLifecycle();
  const refresh = useRefreshIssues();
  const [isMoving, setIsMoving] = useState(false);
  const detail = useSWR<IssueStatusInfo, AppApiError>(
    selected ? `/api/issues/${selected.id}` : null,
    readIssueStatus,
  );
  const mutation = useSWRMutation("/api/issues/status", moveIssue);
  const choose = (issue: RedmineIssueSummary | null) => {
    if (locked.current || uncertain) return;
    setSelected(issue);
    setFailure(null);
    setNotice(null);
  };
  const move = async (statusId: number) => {
    if (locked.current || uncertain || !selected) return;
    locked.current = true;
    setIsMoving(true);
    setFailure(null);
    setNotice(null);
    try {
      const info = detail.data ?? (await detail.mutate());
      if (!info) throw new AppApiError("redmine_unavailable", 503);
      if (!info.allowedStatuses.some((status) => status.id === statusId))
        throw new AppApiError("issue_status_forbidden", 403);
      await mutation.trigger(
        { id: selected.id, statusId, expectedStatusId: info.statusId },
        { throwOnError: true },
      );
      setSelected(null);
      setNotice({});
      await refresh();
    } catch (error) {
      const apiError =
        error instanceof AppApiError ? error : new AppApiError("issue_status_unknown", 0);
      if (apiError.status === 401) {
        endSession();
        return;
      }
      setFailure(apiError);
      setUncertain(apiError.code === "issue_status_unknown");
      if (apiError.code === "issue_status_conflict") {
        await detail.mutate().catch(() => undefined);
        await refresh();
      }
    } finally {
      locked.current = false;
      setIsMoving(false);
    }
  };
  const verify = async () => {
    if (locked.current || !selected) return;
    locked.current = true;
    try {
      const issue = await detail.mutate();
      if (!issue) return;
      setUncertain(false);
      setFailure(null);
      setNotice({ status: issue.status });
      setSelected(null);
      await refresh();
    } catch (error) {
      if (error instanceof AppApiError && error.status === 401) endSession();
    } finally {
      locked.current = false;
    }
  };
  return {
    selected,
    choose,
    move,
    verify,
    refresh,
    uncertain,
    notice,
    info: detail.data,
    error: failure ?? detail.error,
    isLoading: detail.isLoading || detail.isValidating,
    isPending: isMoving,
  };
}
