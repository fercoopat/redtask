import { jsonResponse } from "@/shared/http";
import { apiErrorSchema, type AppErrorCode } from "@/shared/schemas/api-error";

export function apiErrorResponse(code: AppErrorCode, status: number, details?: string[]) {
  return jsonResponse({ error: { code, ...(details ? { details } : {}) } }, status);
}

export class AppApiError extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(code);
    this.name = "AppApiError";
  }
}

export async function readApiError(response: Response, fallback: AppErrorCode) {
  const payload = apiErrorSchema.safeParse(await response.json().catch(() => null));
  return new AppApiError(
    payload.success ? payload.data.error.code : fallback,
    response.status,
    payload.success ? (payload.data.error.details ?? []) : [],
  );
}
