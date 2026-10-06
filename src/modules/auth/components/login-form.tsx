"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import useSWRMutation from "swr/mutation";
import { z } from "zod";

import { apiKeySchema } from "../helpers/schemas";

const formSchema = z.object({ apiKey: apiKeySchema });
type FormValues = z.infer<typeof formSchema>;
type ApiError = { error?: string };

async function submitApiKey(url: string, { arg }: { arg: FormValues }) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiError;
  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudo iniciar sesión. Inténtalo de nuevo.");
  }
  return payload;
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const { trigger, isMutating } = useSWRMutation("/api/auth/session", submitApiKey);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { apiKey: "" },
  });

  const onSubmit = async ({ apiKey }: FormValues) => {
    setFormError(null);
    reset({ apiKey: "" });

    try {
      await trigger({ apiKey });
      router.replace("/issues");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="apiKey" className="label font-medium">
          API Key
        </label>
        <input
          {...register("apiKey")}
          id="apiKey"
          type="password"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Pega tu API Key de Redmine"
          aria-invalid={Boolean(errors.apiKey)}
          aria-describedby={errors.apiKey ? "apiKey-error" : "apiKey-help"}
          className={`input input-bordered w-full focus-visible:outline-2 focus-visible:outline-offset-2 ${errors.apiKey ? "input-error" : ""}`}
        />
        {errors.apiKey ? (
          <p id="apiKey-error" className="text-sm text-error">
            {errors.apiKey.message}
          </p>
        ) : (
          <p id="apiKey-help" className="text-sm text-base-content/60">
            La clave se usa solo para conectar esta sesión.
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="alert alert-error text-sm">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isMutating}
        className="btn btn-primary w-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {isMutating && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
        {isMutating ? "Conectando…" : "Conectar con Redmine"}
      </button>
    </form>
  );
}
