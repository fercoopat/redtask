"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useSpentTimeReport } from "@/modules/spent-time/hooks/use-spent-time-report";
import type { SpentTimeQuery } from "@/modules/spent-time/schemas/spent-time-report";
import { errorMessageKeys } from "@/shared/errors/error-message-keys";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

import { SpentTimeChart } from "./spent-time-chart";
import { TimeEntryTable } from "./time-entry-table";

export function SpentTimeDashboard({
  initialRange,
}: {
  initialRange: { from: string; to: string };
}) {
  const t = useTranslations();
  const format = useFormatter();
  const [query, setQuery] = useState<SpentTimeQuery>({ ...initialRange, page: 1, pageSize: 25 });
  const { data, error, isLoading, isValidating, refresh } = useSpentTimeReport(query);
  const pages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / query.pageSize));
  const setFilter = (updates: Partial<SpentTimeQuery>) =>
    setQuery((current) => ({ ...current, ...updates, page: 1 }));
  return (
    <section className="space-y-6">
      <header className="workspace-page-header space-y-2">
        <h1 className="font-heading text-heading font-semibold tracking-tight">
          {t("spentTime.title")}
        </h1>
        <p className="max-w-2xl text-muted">{t("spentTime.description")}</p>
      </header>

      <section
        className="rounded-lg border border-base-300 bg-base-100 p-5 sm:p-6"
        aria-labelledby="spent-time-filters"
      >
        <h2 id="spent-time-filters" className="mb-4 font-semibold tracking-tight">
          {t("spentTime.filters")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm">
            {t("spentTime.from")}
            <input
              className="input input-bordered"
              type="date"
              value={query.from}
              disabled={isValidating}
              onChange={(event) =>
                setFilter({
                  from: event.target.value,
                  projectId: undefined,
                  activityId: undefined,
                })
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("spentTime.to")}
            <input
              className="input input-bordered"
              type="date"
              value={query.to}
              disabled={isValidating}
              onChange={(event) =>
                setFilter({ to: event.target.value, projectId: undefined, activityId: undefined })
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("spentTime.project")}
            <select
              className="select select-bordered"
              value={query.projectId ?? ""}
              disabled={isValidating || !data}
              onChange={(event) =>
                setFilter({
                  projectId: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            >
              <option value="">{t("spentTime.allProjects")}</option>
              {data?.projects.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t("spentTime.activity")}
            <select
              className="select select-bordered"
              value={query.activityId ?? ""}
              disabled={isValidating || !data}
              onChange={(event) =>
                setFilter({
                  activityId: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            >
              <option value="">{t("spentTime.allActivities")}</option>
              {data?.activities.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <Alert variant="error">
          {t(errorMessageKeys[error.code])}
          <Button type="button" disabled={isValidating} onClick={() => void refresh()}>
            {t("retry")}
          </Button>
        </Alert>
      ) : isLoading || !data ? (
        <p role="status" aria-live="polite">
          {t("spentTime.loading")}
        </p>
      ) : (
        <>
          {isValidating && (
            <p role="status" aria-live="polite" className="text-sm text-muted">
              {t("spentTime.refreshing")}
            </p>
          )}
          <div className="grid gap-6 xl:grid-cols-[minmax(220px,0.7fr)_minmax(0,2fr)] xl:items-start">
            <section
              className="rounded-lg border border-base-300 bg-base-100 px-6 py-5 sm:px-8 sm:py-6"
              aria-label={t("spentTime.total")}
            >
              <p className="text-sm font-medium text-muted">{t("spentTime.total")}</p>
              <p className="mt-1 font-heading text-5xl font-medium tracking-[-0.04em] sm:text-6xl">
                {format.number(data.totalHours)} <span className="text-2xl">h</span>
              </p>
            </section>
            {data.totalCount === 0 ? (
              <div className="rounded-lg border border-base-300 bg-base-100 p-6 xl:col-start-2">
                {t("spentTime.empty")}
              </div>
            ) : (
              <SpentTimeChart report={data} />
            )}
          </div>
          {data.totalCount > 0 && (
            <>
              <TimeEntryTable report={data} />
              <nav
                className="flex flex-wrap items-center justify-between gap-4"
                aria-label={t("spentTime.tableTitle")}
              >
                <p aria-live="polite" className="text-sm">
                  {t("spentTime.pageSummary", {
                    page: query.page,
                    pages,
                    total: format.number(data.totalCount),
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={isValidating || query.page <= 1}
                    onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
                  >
                    {t("spentTime.previous")}
                  </Button>
                  <Button
                    type="button"
                    disabled={isValidating || query.page >= pages}
                    onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
                  >
                    {t("spentTime.next")}
                  </Button>
                </div>
              </nav>
            </>
          )}
        </>
      )}
    </section>
  );
}
