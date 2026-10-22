"use client";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";

import type { DiagnosticReport } from "../schemas/diagnostics";

export function DiagnosticsResults({ report }: { report: DiagnosticReport }) {
  const t = useTranslations("diagnostics");
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "redmine-diagnostics.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section aria-label={t("results")} className="space-y-4">
      <p role="status">
        {t("completed", {
          date: report.generatedAt,
          userId: report.userId,
          projectId: report.projectId,
        })}
      </p>
      <div className="overflow-x-auto">
        <table className="table min-w-[900px]">
          <caption className="sr-only">{t("results")}</caption>
          <thead>
            <tr>
              <th>{t("check")}</th>
              <th>{t("result")}</th>
              <th>HTTP</th>
              <th>{t("duration")}</th>
              <th>{t("compatibility")}</th>
              <th>{t("explanation")}</th>
            </tr>
          </thead>
          <tbody>
            {report.results.map((result) => (
              <tr key={result.id}>
                <th scope="row">{t(`probes.${result.id}`)}</th>
                <td>{t(`states.${result.state}`)}</td>
                <td>{result.httpStatus ?? "—"}</td>
                <td>{result.durationMs} ms</td>
                <td>
                  {result.compatible === null
                    ? "—"
                    : t(result.compatible ? "compatible" : "incompatible")}
                </td>
                <td>{t(`reasons.${result.state}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" onClick={download}>
        {t("download")}
      </Button>
    </section>
  );
}
