import { redirect } from "next/navigation";

import { getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { SpentTimeDashboard } from "@/modules/spent-time/components/spent-time-dashboard";
import { getCurrentMonthRange } from "@/modules/spent-time/helpers/spent-time-query";
import { getAppConfig } from "@/shared/config";

export default async function SpentTimePage() {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");
  const range = getCurrentMonthRange(getAppConfig().appTimeZone);
  return <SpentTimeDashboard initialRange={range} />;
}
