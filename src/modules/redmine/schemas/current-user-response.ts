import { z } from "zod";

export const currentUserResponseSchema = z.object({
  user: z.object({
    id: z.number().int().positive(),
    login: z.string().min(1),
  }),
});
