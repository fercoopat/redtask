"use client";
import { useTranslations } from "next-intl";

import { Alert } from "@/shared/ui/alert";
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
    <section className="space-y-6">
      <header className="workspace-page-header space-y-2">
        <h1 className="text-heading font-semibold">{t("diagnostics.title")}</h1>
        <p className="text-muted">{t("diagnostics.supportTool")}</p>
      </header>
      <Card className="max-w-5xl">
        <CardBody className="space-y-6">
          <Alert variant="info" className="block space-y-2">
            <p>{t("diagnostics.intro")}</p>
            <p className="text-sm">{t("diagnostics.limit")}</p>
          </Alert>
          {d.projectsError && <AppErrorAlert code={d.projectsError.code} />}
          {d.projectsError && <Button onClick={d.retryOptions}>{t("retry")}</Button>}
          {d.isLoading && <p role="status">{t("loadingCreateOptions")}</p>}
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid min-w-0 w-full gap-2 sm:w-auto sm:flex-1">
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
          <Alert variant="warning">{t("diagnostics.creationUnchecked")}</Alert>
          {d.report && <DiagnosticsResults report={d.report} />}
        </CardBody>
      </Card>
    </section>
  );
}
