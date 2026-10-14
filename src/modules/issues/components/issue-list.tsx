"use client";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import type { RedmineUser } from "@/modules/auth/helpers/session";
import { useLogout } from "@/modules/auth/hooks/use-logout";
import {
  type IssueFilterCriterion,
  standardIssueFilters,
  validateIssueFilters,
} from "@/modules/issues/helpers/issue-filter-options";
import { useIssueFilters } from "@/modules/issues/hooks/use-issue-filters";
import { useIssuePreferences } from "@/modules/issues/hooks/use-issue-preferences";
import { useIssuesList } from "@/modules/issues/hooks/use-issues-list";
import { AppApiError } from "@/shared/errors/api-error";
import { errorMessageKeys } from "@/shared/errors/error-message-keys";
import { LocaleSwitcher } from "@/shared/i18n/locale-switcher";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardBody } from "@/shared/ui/card";

import { IssueCreatePanel } from "./issue-create-panel";
import { IssueFilterPanel } from "./issue-filter-panel";
import { IssueTable } from "./issue-table";

export function IssueList({ user }: { user: RedmineUser }) {
  const t = useTranslations();
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<IssueFilterCriterion[]>([]);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const {
    data: filterData,
    error: filterError,
    isValidating: filterOptionsLoading,
    refresh: refreshFilters,
  } = useIssueFilters();
  const fields = filterData?.fields ?? standardIssueFilters;
  const instance =
    filterData?.instance ?? (typeof window !== "undefined" ? window.location.origin : "");
  const { preferences, setPreferences, ready } = useIssuePreferences(
    user.id,
    instance,
    Boolean(filterData || filterError),
  );
  const filtersValid = validateIssueFilters(filters, fields);
  const { data, error, isLoading, isValidating, refresh } = useIssuesList(
    page,
    preferences.pageSize,
    filters,
    ready && filtersValid,
  );
  const issueControlsDisabled = filterOptionsLoading || isValidating;
  const { logout: closeSession, isLoggingOut: isPending } = useLogout();
  const logout = async () => {
    setLogoutError(null);
    try {
      await closeSession();
    } catch (error) {
      setLogoutError(
        error instanceof AppApiError ? t(errorMessageKeys[error.code]) : t("logoutFailed"),
      );
    }
  };
  return (
    <main className="min-h-screen bg-base-100">
      <div className="navbar border-b border-base-300 bg-base-100 px-5 sm:px-8">
        <div className="flex-1 gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-content">
            <span className="font-bold" aria-hidden="true">
              R
            </span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Redmine Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <div className="hidden text-right sm:block">
            <p className="text-xs text-base-content/55">{t("connectedAs")}</p>
            <p className="text-sm font-medium">{user.login}</p>
          </div>
          <Button
            type="button"
            onClick={logout}
            disabled={isPending}
            aria-label={t("logoutAria")}
            className="btn btn-outline btn-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {isPending ? t("loggingOut") : t("logout")}
          </Button>
        </div>
      </div>
      <section className="mx-auto w-full max-w-300 space-y-6 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-charlie-display text-heading font-medium tracking-tight">
              {t("issues")}
            </h1>
            <p className="text-base-content/60">{t("issuesDescription")}</p>
          </div>
          {data && (
            <span className="badge badge-ghost px-3 py-4">
              {t("issueCount", {
                shown: format.number(data.issues.length),
                total: format.number(data.totalCount),
              })}
            </span>
          )}
        </div>

        {logoutError && (
          <Alert variant="error">
            {logoutError}
            <Button type="button" disabled={isPending} onClick={logout}>
              {t("retry")}
            </Button>
          </Alert>
        )}
        <IssueCreatePanel
          onCreated={() => {
            void refresh();
          }}
        />
        <IssueFilterPanel
          availableFields={fields}
          filters={filters}
          disabled={issueControlsDisabled}
          onChangeFilters={(next) => {
            setFilters(next);
            setPage(1);
          }}
          preferences={preferences}
          setPreferences={setPreferences}
        />
        {filterError && (
          <Alert variant="warning">
            {t(errorMessageKeys[filterError.code])}
            <Button
              type="button"
              disabled={filterOptionsLoading}
              onClick={() => {
                void refreshFilters();
              }}
            >
              {t("retryFilters")}
            </Button>
          </Alert>
        )}
        {!filtersValid ? (
          <Alert variant="warning">{t("invalidIssuesFilters")}</Alert>
        ) : error ? (
          <Alert variant="warning">
            {t(errorMessageKeys[error.code])}
            <Button
              type="button"
              disabled={isValidating}
              onClick={() => {
                void refresh();
              }}
            >
              {t("retry")}
            </Button>
          </Alert>
        ) : !ready || isLoading || !data ? (
          <Card role="status" aria-live="polite">
            <CardBody>
              <div className="flex items-center gap-3">
                <span
                  className="loading loading-spinner loading-sm text-primary"
                  aria-hidden="true"
                />
                {t(data ? "refreshingIssues" : "loadingIssues")}
              </div>
            </CardBody>
          </Card>
        ) : data.issues.length === 0 ? (
          <Card>
            <CardBody>
              <h2>{t("noIssues")}</h2>
              <p>{filters.length ? t("changeFilters") : t("noIssuesHint")}</p>
            </CardBody>
          </Card>
        ) : (
          <>
            {isValidating && (
              <div
                className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 px-4 py-3 text-sm"
                role="status"
                aria-live="polite"
              >
                <span
                  className="loading loading-spinner loading-sm text-primary"
                  aria-hidden="true"
                />
                {t("refreshingIssues")}
              </div>
            )}
            <IssueTable
              data={data}
              pageSize={preferences.pageSize}
              disabled={isValidating}
              onPageChange={setPage}
              onPageSizeChange={(pageSize) => {
                setPreferences((current) => ({ ...current, pageSize }));
                setPage(1);
              }}
            />
          </>
        )}
        <footer className="border-t border-base-300 pt-4 text-xs text-base-content/60">
          <p className="mb-1">{t("diagnostics.supportTool")}</p>
          <Link
            className="underline underline-offset-2 hover:text-base-content"
            href="/diagnostics"
          >
            {t("diagnostics.title")}
          </Link>
        </footer>
      </section>
    </main>
  );
}
