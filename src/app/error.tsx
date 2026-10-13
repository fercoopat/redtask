"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  return (
    <main className="grid min-h-screen place-items-center bg-base-200 p-6">
      <section className="w-full max-w-lg space-y-4 rounded-box bg-base-100 p-8 shadow">
        <h1 className="text-2xl font-semibold">{t("appErrorTitle")}</h1>
        <Alert variant="error">{t("appErrorBody")}</Alert>
        <Button variant="primary" onClick={reset}>
          {t("retry")}
        </Button>
      </section>
    </main>
  );
}
