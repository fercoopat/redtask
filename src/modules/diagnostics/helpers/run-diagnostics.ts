import { RedmineRequestError, requestRedmineResponse } from "@/modules/redmine/helpers/redmine-api";
import {
  prioritiesResponseSchema,
  projectCreateResponseSchema,
  projectsResponseSchema,
} from "@/modules/redmine/schemas/create-options-response";
import { currentUserResponseSchema } from "@/modules/redmine/schemas/current-user-response";
import { issueListResponseSchema } from "@/modules/redmine/schemas/issue-list-response";

import { diagnosticReportSchema, type DiagnosticResult } from "../schemas/diagnostics";

export async function runDiagnostics(apiKey: string, userId: number, projectId: number) {
  const probes = [
    {
      id: "user",
      path: "users/current.json",
      valid: (body: unknown) => {
        const p = currentUserResponseSchema.safeParse(body);
        return p.success && p.data.user.id === userId;
      },
    },
    {
      id: "projects",
      path: "projects.json?limit=100",
      valid: (body: unknown) => projectsResponseSchema.safeParse(body).success,
    },
    {
      id: "issues",
      path: `issues.json?project_id=${projectId}&limit=1`,
      valid: (body: unknown) => issueListResponseSchema.safeParse(body).success,
    },
    {
      id: "metadata",
      path: `projects/${projectId}.json?include=trackers,issue_categories,issue_custom_fields`,
      valid: (body: unknown) => {
        const p = projectCreateResponseSchema.safeParse(body);
        return p.success && p.data.project.id === projectId;
      },
    },
    {
      id: "priorities",
      path: "enumerations/issue_priorities.json",
      valid: (body: unknown) => prioritiesResponseSchema.safeParse(body).success,
    },
  ] as const;
  const results: DiagnosticResult[] = [];
  for (const probe of probes) {
    const started = performance.now();
    let httpStatus: number | null = null;
    let compatible: boolean | null = null;
    let state: DiagnosticResult["state"] = "connection";
    try {
      const response = await requestRedmineResponse(probe.path, apiKey);
      httpStatus = response.status;
      if (httpStatus === 401) throw new RedmineRequestError("unauthorized", [], 401);
      if (response.ok) {
        compatible = probe.valid(await response.json().catch(() => null));
        state = compatible ? "ok" : "incompatible";
      } else {
        state =
          httpStatus === 403
            ? "restricted"
            : [404, 501].includes(httpStatus)
              ? "unavailable"
              : httpStatus >= 500
                ? "connection"
                : "incompatible";
        await response.body?.cancel();
      }
    } catch (error) {
      if (error instanceof RedmineRequestError && error.failure === "unauthorized") throw error;
    }
    results.push({
      id: probe.id,
      state,
      httpStatus,
      compatible,
      durationMs: Math.round(performance.now() - started),
    });
  }
  return diagnosticReportSchema.parse({
    generatedAt: new Date().toISOString(),
    userId,
    projectId,
    creationPermission: "unchecked",
    results,
  });
}
