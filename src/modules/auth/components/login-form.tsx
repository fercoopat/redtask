"use client";

import { useTranslations } from "next-intl";

import { useLoginForm } from "@/modules/auth/hooks/use-login-form";
import { AppErrorAlert } from "@/shared/ui/app-error-alert";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

export function LoginForm() {
  const t = useTranslations();
  const { form, submit, isLoggingIn, errorCode } = useLoginForm();
  const { errors } = form.formState;

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <FormField
        label={t("apiKeyLabel")}
        htmlFor="apiKey"
        hint={!errors.apiKey ? t("apiKeyHelp") : undefined}
        error={errors.apiKey ? t("apiKeyRequired") : undefined}
      >
        <Input
          {...form.register("apiKey")}
          id="apiKey"
          type="password"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t("apiKeyPlaceholder")}
          aria-invalid={Boolean(errors.apiKey)}
          aria-describedby={errors.apiKey ? "apiKey-error" : "apiKey-help"}
          className={`w-full focus-visible:outline-2 focus-visible:outline-offset-2 ${errors.apiKey ? "input-error" : ""}`}
        />
      </FormField>

      {errorCode && <AppErrorAlert code={errorCode} />}

      <Button
        type="submit"
        disabled={isLoggingIn}
        variant="primary"
        loading={isLoggingIn}
        className="w-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {isLoggingIn ? t("loggingIn") : t("connectRedmine")}
      </Button>
    </form>
  );
}
