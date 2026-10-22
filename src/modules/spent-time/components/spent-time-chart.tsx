"use client";

import { barX, defineChart, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { SpentTimeReport } from "../schemas/spent-time-report";

export function SpentTimeChart({ report }: { report: SpentTimeReport }) {
  const t = useTranslations("spentTime");
  const format = useFormatter();
  const [mode, setMode] = useState<"projects" | "activities">("projects");
  const groups = report.distribution[mode];
  const trendSummary =
    report.trend.buckets
      .map(({ period, hours }) => `${period}: ${format.number(hours)}h`)
      .join(", ") || t("empty");

  const trendDefinition = useMemo(
    () =>
      defineChart({
        marks: [
          lineY(report.trend.buckets, {
            x: "period",
            y: "hours",
            points: true,
            stroke: "var(--color-chart-line)",
            strokeWidth: 3,
          }),
        ],
        scales: {
          x: { scale: scaleBand, axis: { label: t("periodAxis") } },
          y: { scale: scaleLinear, nice: true, grid: true, axis: { label: t("hours") } },
        },
        tooltip,
        focus: "group-x",
      }),
    [report.trend.buckets, t],
  );

  const distributionDefinition = useMemo(
    () =>
      defineChart({
        marks: [
          barX(groups, {
            x: "hours",
            y: "name",
            fill: "var(--color-chart-accent)",
            radius: 4,
          }),
        ],
        scales: {
          x: { scale: scaleLinear, nice: true, grid: true, axis: { label: t("hours") } },
          y: { scale: scaleBand },
        },
        tooltip,
        focus: "group-y",
      }),
    [groups, t],
  );

  return (
    <section
      className="rounded-lg border border-base-300 bg-base-100 p-5 sm:p-6"
      aria-labelledby="spent-time-trend"
    >
      <h2 id="spent-time-trend" className="text-lg font-semibold tracking-tight">
        {t("trend")}
      </h2>
      <Chart
        definition={trendDefinition}
        initialWidth={720}
        height={260}
        ariaLabel={t("trend")}
        ariaDescription={t("trendDescription", {
          period: t(report.trend.period),
          total: format.number(report.totalHours),
        })}
        className="mt-4 w-full"
      />
      <p className="text-sm text-muted" aria-label={t("trendSummaryLabel")}>
        {t("trendSummary", { summary: trendSummary })}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("distribution")}</h2>
        <div className="view-switch flex-wrap" role="group" aria-label={t("distribution")}>
          {(["projects", "activities"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="btn btn-sm btn-ghost"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {t(value)}
            </button>
          ))}
        </div>
      </div>
      {groups.length ? (
        <Chart
          definition={distributionDefinition}
          initialWidth={720}
          height={Math.max(180, groups.length * 38 + 80)}
          ariaLabel={t("distributionChart", { type: t(mode) })}
          ariaDescription={t("distributionDescription", {
            type: t(mode),
            total: format.number(report.totalHours),
          })}
          className="mt-3 w-full"
        />
      ) : (
        <p className="mt-4 text-sm text-muted">{t("empty")}</p>
      )}
      <ul className="mt-4 space-y-1 text-sm text-muted" aria-label={t("distributionSummaryLabel")}>
        {groups.map((group) => (
          <li key={group.id}>
            {t("distributionSummary", { name: group.name, hours: format.number(group.hours) })}
          </li>
        ))}
      </ul>
    </section>
  );
}
