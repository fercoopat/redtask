"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useLogin } from "@/modules/auth/hooks/use-login";
import { sessionRequestSchema } from "@/modules/auth/schemas/session";
import { AppApiError } from "@/shared/errors/api-error";
import { appErrorCodeSchema } from "@/shared/schemas/api-error";

type LoginValues = { apiKey: string };

export function useLoginForm() {
  const router = useRouter();
  const { login, isLoggingIn } = useLogin();
  const form = useForm<LoginValues>({
    resolver: zodResolver(sessionRequestSchema),
    defaultValues: { apiKey: "" },
  });

  const submit = form.handleSubmit(async ({ apiKey }) => {
    form.clearErrors("root.server");
    form.reset({ apiKey: "" });
    try {
      await login({ apiKey });
      router.replace("/issues");
    } catch (error) {
      const code = error instanceof AppApiError ? error.code : "login_failed";
      form.setError("root.server", { type: "server", message: code });
    }
  });

  const parsedError = appErrorCodeSchema.safeParse(form.formState.errors.root?.server?.message);

  return {
    form,
    submit,
    isLoggingIn,
    errorCode: parsedError.success ? parsedError.data : undefined,
  };
}
