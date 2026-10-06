import { z } from "zod";

export const apiKeySchema = z.string().trim().min(1, "Ingresa tu API Key.");

export const sessionRequestSchema = z.object({
  apiKey: apiKeySchema,
});
