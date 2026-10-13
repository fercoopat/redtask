"use client";
import { useRef, useState } from "react";
import useSWRMutation from "swr/mutation";

import { useSessionLifecycle } from "@/modules/auth/hooks/use-session-lifecycle";
import { useIssueCreateOptions } from "@/modules/issues/hooks/use-issue-create-options";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

import { type DiagnosticReport, diagnosticReportSchema } from "../schemas/diagnostics";

async function readReport(url: string, { arg }: { arg: number }) {
  let response: Response;
  try {
    response = await fetch(`${url}?projectId=${arg}`, { cache: "no-store" });
  } catch {
    throw new AppApiError("diagnostics_failed", 0);
  }
  if (!response.ok) throw await readApiError(response, "diagnostics_failed");
  const parsed = diagnosticReportSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success || parsed.data.projectId !== arg)
    throw new AppApiError("diagnostics_failed", 502);
  return parsed.data;
}
export function useRedmineDiagnostics() {
  const { projects, projectsError, isLoading, retryOptions } = useIssueCreateOptions(0);
  const { endSession } = useSessionLifecycle();
  const [projectId, setProjectId] = useState(0);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<AppApiError | null>(null);
  const pending = useRef(false);
  const mutation = useSWRMutation("/api/diagnostics", readReport);
  const selectProject = (id: number) => {
    if (pending.current) return;
    setProjectId(id);
    setReport(null);
    setError(null);
  };
  const run = async () => {
    if (pending.current || !projects.some((p) => p.id === projectId)) return;
    pending.current = true;
    setError(null);
    setReport(null);
    try {
      setReport(await mutation.trigger(projectId));
    } catch (failure) {
      const appError =
        failure instanceof AppApiError ? failure : new AppApiError("diagnostics_failed", 0);
      if (appError.status === 401) {
        setReport(null);
        endSession();
      } else setError(appError);
    } finally {
      pending.current = false;
    }
  };
  return {
    projects,
    projectsError,
    isLoading,
    retryOptions,
    projectId,
    selectProject,
    report,
    error,
    run,
    isRunning: mutation.isMutating,
  };
}
