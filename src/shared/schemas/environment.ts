import { z } from "zod";

const timeZoneSchema = z
  .string()
  .min(1)
  .default("UTC")
  .refine((timeZone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone });
      return true;
    } catch {
      return false;
    }
  });

export const environmentSchema = z.object({
  REDMINE_BASE_URL: z.url(),
  IRON_SESSION_PASSWORD: z.string().min(32),
  APP_TIME_ZONE: timeZoneSchema,
});
