"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useIssueBoardColumn } from "@/modules/issues/hooks/use-issue-board-column";
import type { RedmineIssueSummary } from "@/modules/redmine/helpers/redmine-api";
import { AppErrorAlert } from "@/shared/ui/app-error-alert";
import { Button } from "@/shared/ui/button";

export function IssueBoardColumn({
  projectId,
  status,
  disabled,
  canDrop,
  onSelect,
  onDrag,
  onDrop,
  onBusy,
}: {
  projectId: number;
  status: { value: string; label: string };
  disabled: boolean;
  canDrop: boolean;
  onSelect: (issue: RedmineIssueSummary) => void;
  onDrag: (issue: RedmineIssueSummary | null) => void;
  onDrop: () => void;
  onBusy: (id: string, busy: boolean) => void;
}) {
  const t = useTranslations();
  const column = useIssueBoardColumn(projectId, Number(status.value));
  const [over, setOver] = useState(false);
  useEffect(() => {
    onBusy(status.value, column.isValidating);
    return () => onBusy(status.value, false);
  }, [column.isValidating, status.value, onBusy]);
  return (
    <section
      className="kanban-column"
      aria-label={status.label}
      aria-busy={column.isValidating}
      data-drop={over && canDrop}
      onDragOver={(event) => {
        if (canDrop && !disabled) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (canDrop && !disabled) onDrop();
      }}
    >
      <header className="flex items-center justify-between gap-2 px-1 pb-2">
        <h2 className="text-sm font-semibold">{status.label}</h2>
        <span className="text-xs tabular-nums text-muted">
          {t("board.count", { loaded: column.issues.length, total: column.total })}
        </span>
      </header>
      {column.isLoading && (
        <p role="status" className="p-3 text-sm">
          <span className="loading loading-spinner loading-xs mr-2" aria-hidden="true" />
          {t("loadingIssues")}
        </p>
      )}
      {column.error && <AppErrorAlert code={column.error.code} />}
      {column.error && (
        <Button disabled={column.isValidating} onClick={() => void column.refresh()}>
          {t("retry")}
        </Button>
      )}
      {!column.isLoading && !column.error && column.issues.length === 0 && (
        <p className="px-1 py-6 text-sm text-muted">{t("board.empty")}</p>
      )}
      {column.issues.map((issue) => (
        <article
          key={issue.id}
          className="kanban-card"
          aria-label={`#${issue.id} ${issue.subject}`}
          draggable={!disabled && issue.statusId !== null}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(issue.id));
            onDrag(issue);
          }}
          onDragEnd={() => onDrag(null)}
        >
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span className="tabular-nums">#{issue.id}</span>
            {issue.priority && <span className="badge badge-ghost badge-sm">{issue.priority}</span>}
          </div>
          <a href={issue.url} target="_blank" rel="noreferrer" draggable={false}>
            {issue.subject}
          </a>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="max-w-40 truncate text-muted">
              {issue.assignedTo || t("board.unassigned")}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled || column.isValidating || issue.statusId === null}
              aria-label={t("board.moveIssue", { id: issue.id })}
              onClick={() => onSelect(issue)}
            >
              {t("board.move")}
            </Button>
          </div>
        </article>
      ))}
      {column.hasMore && (
        <Button
          className="mt-3 w-full"
          variant="ghost"
          disabled={disabled || column.isValidating}
          loading={column.isValidating}
          onClick={() => void column.loadMore()}
        >
          {t("board.more")}
        </Button>
      )}
    </section>
  );
}
