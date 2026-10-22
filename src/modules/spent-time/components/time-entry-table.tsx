"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { SpentTimeReport } from "../schemas/spent-time-report";

export function TimeEntryTable({ report }: { report: SpentTimeReport }) {
  const t = useTranslations("spentTime");
  const format = useFormatter();
  return (
    <section
      className="rounded-lg border border-base-300 bg-base-100"
      aria-labelledby="spent-time-entries"
    >
      <div className="border-b border-base-300 p-5 sm:p-6">
        <h2 id="spent-time-entries" className="text-lg font-semibold tracking-tight">
          {t("tableTitle")}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="table responsive-records" role="table">
          <thead role="rowgroup">
            <tr className="text-muted" role="row">
              <th scope="col" role="columnheader">
                {t("date")}
              </th>
              <th scope="col" role="columnheader">
                {t("hours")}
              </th>
              <th scope="col" role="columnheader">
                {t("project")}
              </th>
              <th scope="col" role="columnheader">
                {t("activity")}
              </th>
              <th scope="col" role="columnheader">
                {t("issue")}
              </th>
              <th scope="col" role="columnheader">
                {t("comments")}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {report.entries.map((entry) => (
              <tr key={entry.id} role="row">
                <td role="cell" data-label={t("date")}>
                  {format.dateTime(new Date(`${entry.spentOn}T12:00:00`), { dateStyle: "medium" })}
                </td>
                <td role="cell" data-label={t("hours")}>
                  {format.number(entry.hours)}
                </td>
                <td role="cell" data-label={t("project")}>
                  {entry.project.name}
                </td>
                <td role="cell" data-label={t("activity")}>
                  {entry.activity.name}
                </td>
                <td role="cell" data-label={t("issue")}>
                  {entry.issue?.subject || t("noValue")}
                </td>
                <td
                  role="cell"
                  data-label={t("comments")}
                  className="record-description max-w-80 whitespace-normal"
                >
                  {entry.comments || t("noValue")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
