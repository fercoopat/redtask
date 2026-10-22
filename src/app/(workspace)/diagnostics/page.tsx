import { redirect } from "next/navigation";

import { getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { DiagnosticsPanel } from "@/modules/diagnostics/components/diagnostics-panel";

export default async function DiagnosticsPage() {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");
  return <DiagnosticsPanel />;
}
