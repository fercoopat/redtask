import assert from "node:assert/strict";
import { test } from "node:test";

import { sessionRequestSchema } from "../../src/modules/auth/schemas/session";
import {
  formatIssueFilterCriterion,
  standardIssueFilters,
  validateIssueFilters,
} from "../../src/modules/issues/helpers/issue-filter-options";
import {
  issuePreferencesKey,
  readIssuePreferences,
} from "../../src/modules/issues/helpers/issue-list-preferences";
import {
  buildIssueListUrl,
  parseIssueListQuery,
} from "../../src/modules/issues/helpers/issue-list-query";
import { createIssueFormSchema } from "../../src/modules/issues/schemas/issue-create-form";
import { createIssueFiltersSchema } from "../../src/modules/issues/schemas/issue-filters";
import { preferencesSchema } from "../../src/modules/issues/schemas/issue-preferences";
import { getAppConfig } from "../../src/shared/config";

const filter = (field: string, operator: string, value?: string) =>
  validateIssueFilters(
    [{ field, operator, ...(value === undefined ? {} : { value }) }],
    standardIssueFilters,
  );

test("login uses identical trimmed rules at both boundaries", () => {
  assert.equal(sessionRequestSchema.safeParse({ apiKey: "   " }).success, false);
  assert.equal(sessionRequestSchema.parse({ apiKey: "  synthetic-A  " }).apiKey, "synthetic-A");
});
test("numeric filters match Redmine operators and integer/float bounds", () => {
  for (const operator of ["=", ">=", "<="])
    assert.equal(filter("done_ratio", operator, "50"), true);
  for (const operator of [">", "<"]) assert.equal(filter("done_ratio", operator, "50"), false);
  for (const value of ["101", "-1", "50.5", "Infinity", "1e2", ""])
    assert.equal(filter("done_ratio", "=", value), false);
  assert.equal(filter("estimated_hours", ">=", "0.5"), true);
  assert.equal(filter("estimated_hours", "=", "-0.5"), false);
});
test("filters reject invalid IDs, dates, duplicates and excess criteria", () => {
  for (const value of ["0", "-1", "abc", "1.5"])
    assert.equal(filter("project_id", "=", value), false);
  assert.equal(filter("project_id", "=", "17"), false);
  assert.equal(filter("assigned_to_id", "=", "17"), false);
  assert.equal(filter("parent_id", "=", "17"), true);
  assert.equal(filter("watcher_id", "=", "17"), true);
  assert.equal(
    createIssueFiltersSchema(standardIssueFilters, { allowUncataloguedListIds: true }).safeParse([
      { field: "project_id", operator: "=", value: "17" },
    ]).success,
    true,
  );
  assert.equal(filter("assigned_to_id", "=", "Alex"), false);
  assert.equal(filter("due_date", ">=", "2024-02-29"), true);
  assert.equal(filter("due_date", ">=", "2025-02-29"), false);
  assert.equal(filter("status_id", "o"), true);
  assert.equal(filter("status_id", "o", "1"), false);
  assert.equal(
    validateIssueFilters(
      [
        { field: "subject", operator: "~", value: "a" },
        { field: "subject", operator: "~", value: "b" },
      ],
      standardIssueFilters,
    ),
    false,
  );
  assert.equal(
    validateIssueFilters(
      Array.from({ length: 21 }, () => ({ field: "subject", operator: "~", value: "a" })),
      standardIssueFilters,
    ),
    false,
  );
});
test("filter summaries show catalog labels while keeping IDs as criterion values", () => {
  const fields = [
    {
      field: "assigned_to_id",
      label: "Asignado a",
      type: "list" as const,
      operators: [{ value: "=", label: "es", requiresValue: true }],
      values: [{ value: "123", label: "Ana García" }],
    },
  ];
  const criterion = { field: "assigned_to_id", operator: "=", value: "123" };
  assert.equal(formatIssueFilterCriterion(criterion, fields), "Asignado a es Ana García");
  assert.equal(
    formatIssueFilterCriterion({ field: "assigned_to_id", operator: "=", value: "456" }, fields),
    "Asignado a es #456",
  );
  assert.equal(criterion.value, "123");
});
test("legacy saved operators remain stored verbatim and require review", () => {
  const saved = {
    id: "old",
    name: "Legacy",
    filters: [{ field: "done_ratio", operator: ">", value: "50" }],
  };
  const preferences = preferencesSchema.parse({ savedFilters: [saved] });
  assert.deepEqual(preferences.savedFilters[0], saved);
  assert.equal(
    validateIssueFilters(preferences.savedFilters[0].filters, standardIssueFilters),
    false,
  );
});
test("preferences isolate users and instances and recover corrupt storage", () => {
  assert.notEqual(
    issuePreferencesKey(1, "https://one.test"),
    issuePreferencesKey(2, "https://one.test"),
  );
  assert.notEqual(
    issuePreferencesKey(1, "https://one.test"),
    issuePreferencesKey(1, "https://two.test"),
  );
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => "broken" },
  });
  try {
    assert.equal(readIssuePreferences(1, "https://one.test").pageSize, 10);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});
const options = {
  projectId: 2,
  trackers: [{ id: 20, name: "Bug" }],
  categories: [{ id: 200, name: "Backend" }],
  priorities: [{ id: 1, name: "Normal" }],
  customFields: [{ id: 18, name: "Required", required: true }],
};
test("creation requires current project, tracker and required custom fields", () => {
  const schema = createIssueFormSchema(options);
  const base = {
    projectId: 2,
    subject: " Subject ",
    trackerId: 20,
    customFieldValues: { "18": "value" },
  };
  assert.equal(schema.safeParse({ ...base, projectId: 1 }).success, false);
  assert.equal(schema.safeParse({ ...base, trackerId: 10 }).success, false);
  assert.equal(schema.safeParse({ ...base, categoryId: 100 }).success, false);
  assert.equal(schema.safeParse({ ...base, customFieldValues: {} }).success, false);
  assert.equal(schema.safeParse({ ...base, subject: "  " }).success, false);
  assert.equal(schema.safeParse({ ...base, description: "x".repeat(20001) }).success, false);
});
test("custom fields map by ID and exclude previous project values", () => {
  const draft = createIssueFormSchema(options).parse({
    projectId: 2,
    trackerId: 20,
    subject: " Subject ",
    description: "Draft",
    customFieldValues: { "9": "stale", "18": "current" },
  });
  assert.deepEqual(draft.customFields, [{ id: 18, value: "current" }]);
  assert.equal(draft.subject, "Subject");
  assert.equal(draft.description, "Draft");
});
test("production configuration requires HTTPS and rejects URL credentials", () => {
  const original = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: "production",
    REDMINE_BASE_URL: "http://synthetic.test",
    IRON_SESSION_PASSWORD: "synthetic-secret-at-least-32-characters",
  });
  try {
    assert.throws(getAppConfig);
    process.env.REDMINE_BASE_URL = "https://user:password@synthetic.test";
    assert.throws(getAppConfig);
    process.env.REDMINE_BASE_URL = "https://synthetic.test/redmine/";
    assert.equal(getAppConfig().redmineBaseUrl, "https://synthetic.test/redmine");
  } finally {
    for (const key of ["NODE_ENV", "REDMINE_BASE_URL", "IRON_SESSION_PASSWORD"]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test("pagination and filter query parsing reject malformed or repeated parameters", () => {
  assert.deepEqual(parseIssueListQuery(new URLSearchParams()), {
    page: 1,
    pageSize: 10,
    filters: [],
  });
  for (const query of [
    "page=0",
    "page=1.5",
    "pageSize=20",
    "page=1&page=2",
    "unknown=value",
    "filter[subject][value]=test",
    "filter[subject][operator]=~&filter[subject][operator]=!",
  ])
    assert.equal(parseIssueListQuery(new URLSearchParams(query)), null);
  const filters = [{ field: "done_ratio", operator: ">=", value: "50" }];
  const url = buildIssueListUrl(2, 25, filters);
  assert.deepEqual(parseIssueListQuery(new URL(url, "https://app.synthetic.test").searchParams), {
    page: 2,
    pageSize: 25,
    filters,
  });
});
