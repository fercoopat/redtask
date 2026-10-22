"use client";
import { useFormatter, useTranslations } from "next-intl";

import { issuePageSizes } from "@/modules/issues/schemas/issue-list-query";
import type { RedmineIssuePage } from "@/modules/redmine/helpers/redmine-api";
import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/ui/select";

export function IssueTable({
  data,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: {
  data: RedmineIssuePage;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const currentPage = Math.floor(data.offset / data.limit) + 1;
  return (
    <div className="records-panel card overflow-hidden rounded-cards">
      <div className="overflow-x-auto">
        <table className="table responsive-records" role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                ID
              </th>
              <th scope="col" role="columnheader">
                {t("subject")}
              </th>
              <th scope="col" role="columnheader">
                {t("project")}
              </th>
              <th scope="col" role="columnheader">
                {t("status")}
              </th>
              <th scope="col" role="columnheader">
                {t("priority")}
              </th>
              <th scope="col" role="columnheader">
                {t("assignee")}
              </th>
              <th scope="col" role="columnheader">
                {t("updated")}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {data?.issues.map((issue) => (
              <tr key={issue.id} role="row">
                <th scope="row" role="rowheader" className="tabular-nums text-xs text-muted">
                  #{issue.id}
                </th>
                <td
                  role="cell"
                  className="record-title min-w-64 max-w-xl whitespace-normal font-medium"
                >
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-link hover:underline"
                  >
                    {issue.subject}
                  </a>
                </td>
                <td role="cell" data-label={t("project")}>
                  {issue.project || "—"}
                </td>
                <td role="cell" data-label={t("status")}>
                  <span className="badge issue-status whitespace-nowrap">
                    {issue.status || "—"}
                  </span>
                </td>
                <td role="cell" data-label={t("priority")}>
                  {issue.priority || "—"}
                </td>
                <td role="cell" data-label={t("assignee")}>
                  {issue.assignedTo || "—"}
                </td>
                <td role="cell" data-label={t("updated")} className="whitespace-nowrap">
                  {issue.updatedAt && !Number.isNaN(new Date(issue.updatedAt).valueOf())
                    ? format.dateTime(new Date(issue.updatedAt), { dateStyle: "medium" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-pagination flex flex-wrap items-center justify-between gap-3 border-t border-base-300 px-5 py-3 text-sm">
        <label className="flex items-center gap-2">
          {t("perPage")}
          <Select
            aria-label={t("issuesPerPage")}
            className="select-sm"
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {issuePageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <span>
            {t("pageSummary", {
              page: format.number(currentPage),
              total: format.number(data.totalCount),
            })}
          </span>
          <Button
            type="button"
            className="btn btn-sm"
            aria-label={t("firstPage")}
            disabled={disabled || currentPage <= 1}
            onClick={() => onPageChange(1)}
          >
            «
          </Button>
          <Button
            type="button"
            className="btn btn-sm"
            aria-label={t("previousPage")}
            disabled={disabled || currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ‹
          </Button>
          <Button
            type="button"
            className="btn btn-sm"
            aria-label={t("nextPage")}
            disabled={disabled || currentPage * pageSize >= data.totalCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            ›
          </Button>
          <Button
            type="button"
            className="btn btn-sm"
            aria-label={t("lastPage")}
            disabled={disabled || currentPage * pageSize >= data.totalCount}
            onClick={() => onPageChange(Math.max(1, Math.ceil(data.totalCount / pageSize)))}
          >
            »
          </Button>
        </div>
      </div>
    </div>
  );
}
