import { z } from "zod";

export const probeIds = ["user", "projects", "issues", "metadata", "priorities"] as const;
export const diagnosticStateSchema = z.enum([
  "ok",
  "restricted",
  "unavailable",
  "incompatible",
  "connection",
  "unchecked",
]);
export const diagnosticReportSchema = z.object({
  generatedAt: z.iso.datetime(),
  userId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  creationPermission: z.literal("unchecked"),
  results: z
    .array(
      z.object({
        id: z.enum(probeIds),
        state: diagnosticStateSchema,
        httpStatus: z.number().int().min(100).max(599).nullable(),
        durationMs: z.number().nonnegative(),
        compatible: z.boolean().nullable(),
      }),
    )
    .length(5),
});
export type DiagnosticReport = z.infer<typeof diagnosticReportSchema>;
export type DiagnosticResult = DiagnosticReport["results"][number];
export const diagnosticQuerySchema = z
  .object({
    projectId: z
      .string()
      .regex(/^[1-9]\d*$/)
      .transform(Number)
      .pipe(z.number().int().positive().safe()),
  })
  .strict();
