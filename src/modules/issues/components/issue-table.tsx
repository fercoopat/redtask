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
}: {
  data: RedmineIssuePage;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const currentPage = Math.floor(data.offset / data.limit) + 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">{t("subject")}</th>
              <th scope="col">{t("project")}</th>
              <th scope="col">{t("status")}</th>
              <th scope="col">{t("priority")}</th>
              <th scope="col">{t("assignee")}</th>
              <th scope="col">{t("updated")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.issues.map((issue) => (
              <tr key={issue.id}>
                <th scope="row" className="font-mono text-xs text-base-content/60">
                  #{issue.id}
                </th>
                <td className="min-w-64 max-w-xl whitespace-normal font-medium">{issue.subject}</td>
                <td>{issue.project || "—"}</td>
                <td>{issue.status || "—"}</td>
                <td>{issue.priority || "—"}</td>
                <td>{issue.assignedTo || "—"}</td>
                <td className="whitespace-nowrap">
                  {issue.updatedAt && !Number.isNaN(new Date(issue.updatedAt).valueOf())
                    ? format.dateTime(new Date(issue.updatedAt), { dateStyle: "medium" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 px-5 py-3 text-sm">
        <label className="flex items-center gap-2">
          {t("perPage")}
          <Select
            aria-label={t("issuesPerPage")}
            className="select-sm"
            value={pageSize}
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
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
          >
            «
          </Button>
          <Button
            type="button"
            className="btn btn-sm"
            aria-label={t("previousPage")}
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ‹
          </Button>
          <Button
            type="button"
            className="btn btn-sm"
            aria-label={t("nextPage")}
            disabled={currentPage * pageSize >= data.totalCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            ›
          </Button>
          <Button
            type="button"
            className="btn btn-sm"
            aria-label={t("lastPage")}
            disabled={currentPage * pageSize >= data.totalCount}
            onClick={() => onPageChange(Math.max(1, Math.ceil(data.totalCount / pageSize)))}
          >
            »
          </Button>
        </div>
      </div>
    </div>
  );
}
