import { z } from "zod";

export const environmentSchema = z.object({
  REDMINE_BASE_URL: z.url(),
  IRON_SESSION_PASSWORD: z.string().min(32),
});
