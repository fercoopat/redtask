import { redirect } from "next/navigation";

import { SessionCacheProvider } from "@/modules/auth/components/session-cache-provider";
import { getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { IssueList } from "@/modules/issues/components/issue-list";

export default async function IssuesPage() {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");

  return (
    <SessionCacheProvider key={`${session.userId}:${session.expiresAt}`}>
      <IssueList user={{ id: session.userId, login: session.login }} />
    </SessionCacheProvider>
  );
}
