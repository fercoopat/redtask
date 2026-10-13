import { execFileSync } from "node:child_process";

import { z } from "zod";

// Read credentials only from our named local container, never from deployment env files.
const userSchema = z.object({
  id: z.number().int().positive(),
  login: z.string(),
  apiKey: z.string().min(1),
});
const fixtureSchema = z.object({
  environment: z.literal("redmine-ui-local-test"),
  version: z.string().startsWith("6.1.5"),
  users: z.object({ creator: userSchema, reader: userSchema }),
  projects: z
    .array(
      z.object({
        id: z.number().int().positive(),
        identifier: z.string().startsWith("local-qa-"),
        trackerId: z.number().int().positive(),
        categoryId: z.number().int().positive(),
        customFieldId: z.number().int().positive(),
      }),
    )
    .length(2),
});
export const fixture = fixtureSchema.parse(
  JSON.parse(
    execFileSync(
      "docker",
      [
        "compose",
        "-f",
        "compose.redmine-test.yml",
        "exec",
        "-T",
        "--user",
        "redmine",
        "redmine",
        "cat",
        "sqlite/test-fixture.json",
      ],
      { encoding: "utf8" },
    ),
  ),
);
export const redmineURL = "http://127.0.0.1:3030";
