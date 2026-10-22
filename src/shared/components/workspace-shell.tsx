"use client";

import { Clock3, LayoutList, LogOut, Menu, Palette, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";

import { useLogout } from "@/modules/auth/hooks/use-logout";
import { ThemeSwitcher } from "@/shared/components/theme-switcher";
import { LocaleSwitcher } from "@/shared/i18n/locale-switcher";
import type { Theme } from "@/shared/schemas/theme";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { SidePanel } from "@/shared/ui/side-panel";

export function WorkspaceShell({
  children,
  login,
  theme,
}: {
  children: ReactNode;
  login: string;
  theme: Theme;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const { logout, isLoggingOut } = useLogout();
  const endSession = async () => {
    setLogoutError(false);
    try {
      await logout();
    } catch {
      setLogoutError(true);
    }
  };
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-content">
        {t("workspaceUi.skipContent")}
      </a>
      <header className="navbar workspace-navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <details
            ref={menuRef}
            className="dropdown"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                event.currentTarget.open = false;
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary
              role="button"
              className="btn btn-ghost btn-circle"
              aria-label={t("workspaceUi.openNavigation")}
            >
              <Menu size={20} aria-hidden="true" />
            </summary>
            <nav
              aria-label={t("workspaceUi.navigation")}
              className="dropdown-content bg-base-100 rounded-box mt-3 w-64 p-2 shadow"
            >
              <ul className="menu menu-sm w-full">
                {[
                  { href: "/issues", label: t("issues"), Icon: LayoutList },
                  { href: "/spent-time", label: t("workspaceUi.myTime"), Icon: Clock3 },
                  { href: "/diagnostics", label: t("diagnostics.title"), Icon: ShieldCheck },
                ].map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={pathname === href ? "page" : undefined}
                      onClick={() => {
                        if (menuRef.current) menuRef.current.open = false;
                      }}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
        <div className="navbar-center">
          <Link
            href="/issues"
            className="btn btn-ghost workspace-navbar-brand"
            aria-label="Redmine Workspace"
          >
            <span className="workspace-mark" aria-hidden="true">
              R
            </span>
            <span>
              Redmine<span className="block text-xs font-normal text-muted">Workspace</span>
            </span>
          </Link>
        </div>
        <div className="navbar-end gap-1">
          <Button
            variant="ghost"
            className="btn-circle"
            aria-label={t("workspaceUi.accountSettings")}
            onClick={() => setAccountOpen(true)}
          >
            <Palette size={20} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className="btn-circle"
            disabled={isLoggingOut}
            aria-label={t("logoutAria")}
            onClick={() => void endSession()}
          >
            <LogOut size={20} aria-hidden="true" />
          </Button>
        </div>
      </header>
      <SidePanel
        open={accountOpen}
        title={t("workspaceUi.accountSettings")}
        onClose={() => setAccountOpen(false)}
      >
        <div className="workspace-user">
          <span className="workspace-avatar" aria-hidden="true">
            {login.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">{t("connectedAs")}</p>
            <p className="my-1 break-all text-sm font-semibold">{login}</p>
          </div>
        </div>
        <div className="workspace-account-controls">
          <ThemeSwitcher initialTheme={theme} />
          <LocaleSwitcher />
        </div>
      </SidePanel>
      <main id="workspace-content" tabIndex={-1} className="workspace-content">
        {logoutError && (
          <Alert variant="error">
            {t("logoutFailed")}
            <Button disabled={isLoggingOut} onClick={() => void endSession()}>
              {t("retry")}
            </Button>
          </Alert>
        )}
        {children}
      </main>
    </div>
  );
}
