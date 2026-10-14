import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentUser } from "@/modules/auth/helpers/session";
import { LocaleSwitcher } from "@/shared/i18n/locale-switcher";
import { Card, CardBody } from "@/shared/ui/card";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/issues");
  const t = await getTranslations();

  return (
    <main className="hero min-h-screen bg-base-200 px-5 py-12">
      <div className="hero-content grid w-full max-w-6xl gap-12 lg:grid-cols-[1fr_440px] lg:gap-20">
        <section className="space-y-7">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-content">
              <span className="text-lg font-bold" aria-hidden="true">
                R
              </span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Redmine Workspace</span>
          </div>
          <LocaleSwitcher />
          <div className="space-y-4">
            <p className="badge badge-primary badge-outline">{t("workspace")}</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {t("headline")}
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-base-content/65">
              {t("loginIntro")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-base-content/70">
            <span className="badge badge-ghost py-4">{t("accountAccess")}</span>
            <span className="badge badge-ghost py-4">{t("encryptedConnection")}</span>
          </div>
        </section>

        <Card className="w-full">
          <CardBody className="gap-6 p-7 sm:p-9">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
                {t("welcome")}
              </p>
              <h2 className="card-title text-2xl">{t("connectAccount")}</h2>
              <p className="text-sm leading-relaxed text-base-content/60">{t("apiKeyPrompt")}</p>
            </div>
            <LoginForm />
            <div className="divider my-0" />
            <p className="text-xs leading-relaxed text-base-content/55">{t("apiKeyStorage")}</p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
