import { z } from "zod";

export const apiKeySchema = z.string().trim().min(1, "apiKeyRequired");
export const sessionRequestSchema = z.object({ apiKey: apiKeySchema });
