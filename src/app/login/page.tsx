import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentUser } from "@/modules/auth/helpers/session";
import { ThemeSwitcher } from "@/shared/components/theme-switcher";
import { LocaleSwitcher } from "@/shared/i18n/locale-switcher";
import { parseTheme } from "@/shared/schemas/theme";
import { Card, CardBody } from "@/shared/ui/card";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/issues");
  const t = await getTranslations();
  const theme = parseTheme((await cookies()).get("workspace-theme")?.value);

  return (
    <main className="hero min-h-screen bg-base-200 px-4 py-6 md:py-12">
      <div className="hero-content grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_440px] lg:gap-20">
        <section className="login-hero space-y-4 lg:space-y-7">
          <div className="flex items-center gap-3">
            <div className="workspace-mark">
              <span className="text-lg font-bold" aria-hidden="true">
                R
              </span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Redmine Workspace</span>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <LocaleSwitcher />
            <ThemeSwitcher initialTheme={theme} />
          </div>
          <div className="space-y-4 hidden lg:block">
            <h2 className="login-headline font-heading font-medium">{t("headline")}</h2>
            <p className="max-w-lg text-lg leading-relaxed text-muted">{t("loginIntro")}</p>
          </div>
          <div className="hidden flex-wrap gap-3 text-sm text-muted lg:flex">
            <span className="badge badge-ghost py-4">{t("accountAccess")}</span>
            <span className="badge badge-ghost py-4">{t("encryptedConnection")}</span>
          </div>
        </section>

        <Card className="w-full">
          <CardBody className="gap-6 p-5 sm:p-8">
            <div className="space-y-2">
              <h1 className="card-title text-2xl">{t("connectAccount")}</h1>
              <p className="text-sm leading-relaxed text-muted">{t("apiKeyPrompt")}</p>
            </div>
            <LoginForm />
            <div className="divider my-0" />
            <p className="text-xs leading-relaxed text-muted">{t("apiKeyStorage")}</p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
