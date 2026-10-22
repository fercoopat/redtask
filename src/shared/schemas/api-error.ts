import { z } from "zod";

export const appErrorCodes = [
  "diagnostics_failed",
  "invalid_diagnostics_query",
  "request_not_allowed",
  "invalid_request_format",
  "invalid_locale",
  "invalid_api_key",
  "invalid_credentials",
  "rest_forbidden",
  "redmine_unavailable",
  "redmine_unexpected",
  "login_failed",
  "logout_failed",
  "invalid_issues_query",
  "session_required",
  "custom_fields_unavailable",
  "invalid_issues_filters",
  "api_key_revoked",
  "issues_forbidden",
  "issues_load_failed",
  "invalid_spent_time_query",
  "spent_time_forbidden",
  "spent_time_load_failed",
  "filters_load_failed",
  "invalid_issue_draft",
  "issue_project_unavailable",
  "create_options_failed",
  "issue_create_forbidden",
  "issue_create_validation",
  "issue_create_unknown",
  "invalid_issue_status",
  "issue_status_forbidden",
  "issue_status_conflict",
  "issue_status_validation",
  "issue_status_unknown",
  "issue_not_found",
] as const;

export const appErrorCodeSchema = z.enum(appErrorCodes);
export const apiErrorSchema = z.object({
  error: z.object({ code: appErrorCodeSchema, details: z.array(z.string()).optional() }),
});
export type AppErrorCode = z.infer<typeof appErrorCodeSchema>;
export type ApiErrorPayload = z.infer<typeof apiErrorSchema>;
