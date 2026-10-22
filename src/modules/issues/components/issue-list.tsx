"use client";
import { Columns3, LayoutList } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import type { RedmineUser } from "@/modules/auth/helpers/session";
import { IssueBoard } from "@/modules/issues/components/issue-board";
import {
  type IssueFilterCriterion,
  standardIssueFilters,
  validateIssueFilters,
} from "@/modules/issues/helpers/issue-filter-options";
import { useIssueFilters } from "@/modules/issues/hooks/use-issue-filters";
import { useIssuePreferences } from "@/modules/issues/hooks/use-issue-preferences";
import { useIssuesList, useRefreshIssues } from "@/modules/issues/hooks/use-issues-list";
import { errorMessageKeys } from "@/shared/errors/error-message-keys";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardBody } from "@/shared/ui/card";

import { IssueCreatePanel } from "./issue-create-panel";
import { IssueFilterPanel } from "./issue-filter-panel";
import { IssueTable } from "./issue-table";

export function IssueList({ user }: { user: RedmineUser }) {
  const t = useTranslations();
  const format = useFormatter();
  const refreshAllIssues = useRefreshIssues();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<IssueFilterCriterion[]>([]);
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
    ready && filtersValid && preferences.view === "list",
  );
  const issueControlsDisabled = filterOptionsLoading || isValidating;
  return (
    <section className="space-y-6">
      <div className="workspace-page-header flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-40 flex-1 space-y-2">
          <h1 className="font-heading text-heading font-semibold tracking-tight">{t("issues")}</h1>
          <p className="hidden text-muted sm:block">{t("issuesDescription")}</p>
        </div>
        <IssueCreatePanel
          projectId={preferences.view === "board" ? preferences.boardProjectId : null}
          onCreated={() => {
            void refreshAllIssues();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="view-switch" role="group" aria-label={t("workspaceUi.view")}>
          {(["list", "board"] as const).map((view) => (
            <Button
              key={view}
              variant="ghost"
              aria-pressed={preferences.view === view}
              disabled={!ready || isValidating}
              onClick={() => setPreferences((current) => ({ ...current, view }))}
            >
              {view === "list" ? (
                <LayoutList size={16} aria-hidden="true" />
              ) : (
                <Columns3 size={16} aria-hidden="true" />
              )}
              {t(`workspaceUi.${view}`)}
            </Button>
          ))}
        </div>
        {data && preferences.view === "list" && (
          <span className="badge badge-ghost px-3 py-4">
            {t("issueCount", {
              shown: format.number(data.issues.length),
              total: format.number(data.totalCount),
            })}
          </span>
        )}
      </div>
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
      {ready && (
        <div hidden={preferences.view !== "board"}>
          <IssueBoard
            fields={fields}
            projectId={preferences.boardProjectId}
            onProjectChange={(boardProjectId) =>
              setPreferences((current) => ({ ...current, boardProjectId }))
            }
          />
        </div>
      )}
      <div hidden={preferences.view !== "list"} className="space-y-5">
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
      </div>
    </section>
  );
}
