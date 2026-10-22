import { redirect } from "next/navigation";

import { getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { IssueList } from "@/modules/issues/components/issue-list";

export default async function IssuesPage() {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");

  return <IssueList user={{ id: session.userId, login: session.login }} />;
}
