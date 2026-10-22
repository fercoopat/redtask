import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { parseTheme } from "@/shared/schemas/theme";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: "Redmine Workspace", description: t("metadataDescription") };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const theme = parseTheme((await cookies()).get("workspace-theme")?.value);
  return (
    <html lang={locale} data-theme={theme} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
