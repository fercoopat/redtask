"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { IssueBoardColumn } from "@/modules/issues/components/issue-board-column";
import type { IssueFilterOption } from "@/modules/issues/helpers/issue-filter-options";
import { useIssueBoardActions } from "@/modules/issues/hooks/use-issue-board-actions";
import type { RedmineIssueSummary } from "@/modules/redmine/helpers/redmine-api";
import { Alert } from "@/shared/ui/alert";
import { AppErrorAlert } from "@/shared/ui/app-error-alert";
import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/ui/select";

export function IssueBoard({
  fields,
  projectId,
  onProjectChange,
}: {
  fields: IssueFilterOption[];
  projectId: number | null;
  onProjectChange: (id: number | null) => void;
}) {
  const t = useTranslations();
  const actions = useIssueBoardActions();
  const [busyColumns, setBusyColumns] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState(false);
  const [destination, setDestination] = useState("");
  const actionPanel = useRef<HTMLDivElement>(null);
  const statuses = fields.find((field) => field.field === "status_id")?.values;
  const projects = fields.find((field) => field.field === "project_id")?.values;
  const busy = Object.values(busyColumns).some(Boolean);
  const locked = actions.isPending || actions.uncertain;
  const destinations =
    actions.info?.allowedStatuses.filter((status) => status.id !== actions.info?.statusId) ?? [];
  const onBusy = useCallback((id: string, value: boolean) => {
    setBusyColumns((current) => (current[id] === value ? current : { ...current, [id]: value }));
  }, []);
  useEffect(() => {
    if (actions.selected && !dragging) actionPanel.current?.focus();
  }, [actions.selected, dragging]);
  const select = (issue: RedmineIssueSummary) => {
    setDestination("");
    actions.choose(issue);
  };
  if (!projects?.length || !statuses?.length)
    return <Alert variant="warning">{t("board.catalogUnavailable")}</Alert>;
  const validProject = projects.some((project) => Number(project.value) === projectId);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="grid min-w-56 gap-1 text-sm">
          {t("project")}
          <Select
            aria-label={t("project")}
            value={validProject ? projectId! : ""}
            disabled={busy || locked || actions.isLoading}
            onChange={(event) => {
              actions.choose(null);
              onProjectChange(event.target.value ? Number(event.target.value) : null);
            }}
          >
            <option value="">{t("selectProject")}</option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </Select>
        </label>
        <Button
          variant="outline"
          disabled={busy || locked || !validProject}
          onClick={() => void actions.refresh()}
        >
          {t("board.refresh")}
        </Button>
      </div>
      {actions.notice && (
        <p role="status" className="text-sm text-success">
          {actions.notice.status
            ? t("board.verified", { status: actions.notice.status })
            : t("board.saved")}
        </p>
      )}
      {actions.selected && (
        <div
          hidden={dragging}
          ref={actionPanel}
          tabIndex={-1}
          className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3"
          role="region"
          aria-label={t("board.moveIssue", { id: actions.selected.id })}
        >
          <p className="font-semibold">
            #{actions.selected.id} {actions.selected.subject}
          </p>
          {actions.info && (
            <p className="text-sm text-muted">
              {t("status")}: {actions.info.status}
            </p>
          )}
          {actions.isLoading && <p role="status">{t("board.loading")}</p>}
          {actions.isPending && <p role="status">{t("board.moving")}</p>}
          {actions.error && (
            <AppErrorAlert code={actions.error.code} details={actions.error.details} />
          )}
          {actions.uncertain ? (
            <Button disabled={actions.isLoading} onClick={() => void actions.verify()}>
              {t("board.verify")}
            </Button>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              {destinations.length > 0 ? (
                <>
                  <label className="grid min-w-48 gap-1 text-sm">
                    {t("board.destination")}
                    <Select
                      aria-label={t("board.destination")}
                      value={destination}
                      disabled={actions.isLoading || actions.isPending || busy}
                      onChange={(event) => setDestination(event.target.value)}
                    >
                      <option value="">{t("selectValue")}</option>
                      {destinations.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <Button
                    variant="outline"
                    disabled={
                      actions.isPending ||
                      actions.isLoading ||
                      busy ||
                      !destinations.some((status) => status.id === Number(destination))
                    }
                    onClick={() => void actions.move(Number(destination))}
                  >
                    {t("board.apply")}
                  </Button>
                </>
              ) : (
                !actions.isLoading &&
                !actions.error && <p className="text-sm text-muted">{t("board.noTransitions")}</p>
              )}
              <Button
                variant="ghost"
                disabled={actions.isPending}
                onClick={() => actions.choose(null)}
              >
                {t("board.cancel")}
              </Button>
            </div>
          )}
          <a className="link text-sm" href={actions.selected.url} target="_blank" rel="noreferrer">
            {t("openIssue")}
          </a>
        </div>
      )}
      {!validProject ? (
        <p className="rounded-lg border border-dashed border-base-300 p-8 text-muted">
          {t("board.chooseProject")}
        </p>
      ) : (
        <div className="kanban-board" aria-label={t("workspaceUi.board")}>
          {statuses.map((status) => (
            <IssueBoardColumn
              key={`${projectId}:${status.value}`}
              projectId={projectId!}
              status={status}
              disabled={locked || busy}
              canDrop={
                dragging &&
                (!actions.info || destinations.some((target) => target.id === Number(status.value)))
              }
              onBusy={onBusy}
              onSelect={select}
              onDrag={(issue) => {
                setDragging(Boolean(issue));
                if (issue) select(issue);
              }}
              onDrop={() => {
                setDragging(false);
                void actions.move(Number(status.value));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
