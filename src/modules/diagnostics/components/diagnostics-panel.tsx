"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/shared/i18n/locale-switcher";
import { AppErrorAlert } from "@/shared/ui/app-error-alert";
import { Button } from "@/shared/ui/button";
import { Card, CardBody } from "@/shared/ui/card";
import { Select } from "@/shared/ui/select";

import { useRedmineDiagnostics } from "../hooks/use-redmine-diagnostics";
import { DiagnosticsResults } from "./diagnostics-results";

export function DiagnosticsPanel() {
  const t = useTranslations();
  const d = useRedmineDiagnostics();
  return (
    <main className="min-h-screen bg-base-200 px-5 py-10">
      <Card className="mx-auto max-w-7xl">
        <CardBody className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/issues">{t("issues")}</Link>
            <LocaleSwitcher />
          </div>
          <h1 className="text-3xl font-semibold">{t("diagnostics.title")}</h1>
          <p>{t("diagnostics.intro")}</p>
          <p>{t("diagnostics.limit")}</p>
          {d.projectsError && <AppErrorAlert code={d.projectsError.code} />}
          {d.projectsError && <Button onClick={d.retryOptions}>{t("retry")}</Button>}
          {d.isLoading && <p role="status">{t("loadingCreateOptions")}</p>}
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <label htmlFor="diagnostic-project">{t("project")}</label>
              <Select
                id="diagnostic-project"
                value={d.projectId || ""}
                disabled={d.isRunning || d.isLoading}
                onChange={(e) => d.selectProject(Number(e.target.value))}
              >
                <option value="">{t("selectProject")}</option>
                {d.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              variant="primary"
              loading={d.isRunning}
              disabled={d.isRunning || !d.projectId || Boolean(d.projectsError)}
              onClick={() => void d.run()}
            >
              {t(d.isRunning ? "diagnostics.running" : "diagnostics.run")}
            </Button>
          </div>
          {d.error && <AppErrorAlert code={d.error.code} />}
          <p>{t("diagnostics.creationUnchecked")}</p>
          {d.report && <DiagnosticsResults report={d.report} />}
        </CardBody>
      </Card>
    </main>
  );
}
