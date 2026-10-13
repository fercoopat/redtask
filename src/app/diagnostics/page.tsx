import { redirect } from "next/navigation";

import { SessionCacheProvider } from "@/modules/auth/components/session-cache-provider";
import { getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { DiagnosticsPanel } from "@/modules/diagnostics/components/diagnostics-panel";

export default async function DiagnosticsPage() {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");
  return (
    <SessionCacheProvider key={`${session.userId}:${session.expiresAt}`}>
      <DiagnosticsPanel />
    </SessionCacheProvider>
  );
}
