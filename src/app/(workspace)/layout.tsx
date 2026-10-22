import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SessionCacheProvider } from "@/modules/auth/components/session-cache-provider";
import { getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { WorkspaceShell } from "@/shared/components/workspace-shell";
import { parseTheme } from "@/shared/schemas/theme";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");
  const theme = parseTheme((await cookies()).get("workspace-theme")?.value);
  return (
    <SessionCacheProvider key={`${session.userId}:${session.expiresAt}`}>
      <WorkspaceShell login={session.login} theme={theme}>
        {children}
      </WorkspaceShell>
    </SessionCacheProvider>
  );
}
