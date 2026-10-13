"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { SWRConfig, useSWRConfig } from "swr";

import { SessionLifecycleContext } from "@/modules/auth/hooks/use-session-lifecycle";
import { AppApiError } from "@/shared/errors/api-error";

function SessionBoundary({ children }: { children: ReactNode }) {
  const { unload } = useSWRConfig();
  const router = useRouter();
  const t = useTranslations();
  const stopped = useRef(false);
  const [ended, setEnded] = useState(false);
  const endSession = useCallback(() => {
    if (stopped.current) return;
    stopped.current = true;
    setEnded(true);
    unload({ revalidate: false });
    router.replace("/login");
    router.refresh();
  }, [unload, router]);
  if (ended)
    return (
      <main className="grid min-h-screen place-items-center">
        <p role="status">{t("sessionEnded")}</p>
      </main>
    );
  return (
    <SessionLifecycleContext.Provider value={endSession}>
      <SWRConfig
        value={{
          onError: (error: unknown) => {
            if (error instanceof AppApiError && error.status === 401) endSession();
          },
          shouldRetryOnError: (error: unknown) =>
            !(error instanceof AppApiError && [400, 401, 403].includes(error.status)),
        }}
      >
        {children}
      </SWRConfig>
    </SessionLifecycleContext.Provider>
  );
}

export function SessionCacheProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(() => new Map());
  return (
    <SWRConfig value={{ provider: () => cache }}>
      <SessionBoundary>{children}</SessionBoundary>
    </SWRConfig>
  );
}
