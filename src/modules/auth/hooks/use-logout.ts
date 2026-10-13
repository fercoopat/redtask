"use client";

import useSWRMutation from "swr/mutation";

import { useSessionLifecycle } from "@/modules/auth/hooks/use-session-lifecycle";
import { AppApiError, readApiError } from "@/shared/errors/api-error";

async function endSession(url: string) {
  let response: Response;
  try {
    response = await fetch(url, { method: "DELETE" });
  } catch {
    throw new AppApiError("logout_failed", 0);
  }
  if (!response.ok) throw await readApiError(response, "logout_failed");
}

export function useLogout() {
  const { endSession: finishSession } = useSessionLifecycle();
  const { trigger, isMutating } = useSWRMutation<void, AppApiError, string, undefined>(
    "/api/auth/session",
    endSession,
  );
  return {
    logout: async () => {
      await trigger(undefined, { throwOnError: true });
      finishSession();
    },
    isLoggingOut: isMutating,
  };
}
