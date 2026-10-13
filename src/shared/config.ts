import { environmentSchema } from "@/shared/schemas/environment";

export function getAppConfig() {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error("Server configuration is missing or invalid.");
  }

  const baseUrl = new URL(result.data.REDMINE_BASE_URL);
  if (
    !["http:", "https:"].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:")
  ) {
    throw new Error("Server configuration is invalid.");
  }

  return {
    redmineBaseUrl: result.data.REDMINE_BASE_URL.replace(/\/+$/, ""),
    ironSessionPassword: result.data.IRON_SESSION_PASSWORD,
  };
}
