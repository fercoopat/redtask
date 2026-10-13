"use client";

import useSWRMutation from "swr/mutation";

import { AppApiError, readApiError } from "@/shared/errors/api-error";

type LoginArgument = { apiKey: string };

async function postApiKey(url: string, { arg }: { arg: LoginArgument }) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: arg.apiKey }),
    });
  } catch {
    throw new AppApiError("redmine_unavailable", 0);
  }
  if (!response.ok) throw await readApiError(response, "login_failed");
  return response.json();
}

export function useLogin() {
  const { trigger, isMutating } = useSWRMutation<unknown, AppApiError, string, LoginArgument>(
    "/api/auth/session",
    postApiKey,
  );
  return {
    login: (argument: LoginArgument) => trigger(argument, { throwOnError: true }),
    isLoggingIn: isMutating,
  };
}
