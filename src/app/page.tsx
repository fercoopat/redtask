import { redirect } from "next/navigation";

import { getCurrentUser } from "@/modules/auth/helpers/session";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/issues" : "/login");
}
