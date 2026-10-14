"use client";

import { useTranslations } from "next-intl";

import { IssueCreateDetailFields } from "@/modules/issues/components/issue-create-detail-fields";
import { IssueCreateProjectFields } from "@/modules/issues/components/issue-create-project-fields";
import type { useIssueCreateForm } from "@/modules/issues/hooks/use-issue-create-form";
import { AppApiError } from "@/shared/errors/api-error";
import { Alert } from "@/shared/ui/alert";
import { AppErrorAlert } from "@/shared/ui/app-error-alert";
import { Button } from "@/shared/ui/button";
import { CardBody } from "@/shared/ui/card";

export function IssueCreateForm({
  controller,
}: {
  controller: ReturnType<typeof useIssueCreateForm>;
}) {
  const t = useTranslations();
  const {
    form,
    projects,
    projectsError,
    options,
    optionsError,
    isCreating,
    error,
    errorDetails,
    ambiguous,
    verified,
    setVerified,
    submit,
    canSubmit,
    changeProject,
    isLoading,
    isValidating,
    retryOptions,
  } = controller;

  return (
    <form
      noValidate
      onSubmit={submit}
      className="card border border-base-300 bg-base-100 shadow-sm"
      aria-label={t("createIssue")}
    >
      <CardBody className="gap-4">
        <h2 className="text-xl font-semibold">{t("createIssue")}</h2>
        {projectsError ? (
          <AppErrorAlert
            code={
              projectsError instanceof AppApiError ? projectsError.code : "create_options_failed"
            }
          />
        ) : null}
        {optionsError ? (
          <AppErrorAlert
            code={optionsError instanceof AppApiError ? optionsError.code : "create_options_failed"}
          />
        ) : null}
        {isLoading && <p role="status">{t("loadingCreateOptions")}</p>}
        {(projectsError || optionsError) && (
          <Button type="button" disabled={isValidating} onClick={retryOptions}>
            {t("retry")}
          </Button>
        )}
        <fieldset
          className="contents"
          disabled={isValidating || isCreating || form.formState.isSubmitting || ambiguous}
        >
          <IssueCreateProjectFields
            form={form}
            projects={projects}
            options={options}
            onProjectChange={changeProject}
          />
          <IssueCreateDetailFields form={form} options={options} />
        </fieldset>
        {form.formState.errors.root ? (
          <Alert variant="error">{t("invalidIssueDraft")}</Alert>
        ) : null}
        {error ? (
          <AppErrorAlert
            code={error instanceof AppApiError ? error.code : "issue_create_unknown"}
            details={errorDetails}
          />
        ) : null}
        {ambiguous ? <p role="status">{t("issueCreateVerify")}</p> : null}
        {ambiguous ? (
          <label className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
            />
            <span>{t("issueCreateVerified")}</span>
          </label>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          className="self-start"
          disabled={
            !canSubmit || isCreating || form.formState.isSubmitting || (ambiguous && !verified)
          }
        >
          {isCreating ? t("issueCreating") : ambiguous ? t("issueCreateRetry") : t("createIssue")}
        </Button>
      </CardBody>
    </form>
  );
}
