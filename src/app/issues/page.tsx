import { redirect } from "next/navigation";

import { getCurrentUser } from "@/modules/auth/helpers/session";
import { IssueList } from "@/modules/issues/components/issue-list";

export default async function IssuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <IssueList user={user} />;
}
