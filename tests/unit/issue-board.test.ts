import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { preferencesSchema } from "../../src/modules/issues/schemas/issue-preferences";
import { issueStatusChangeSchema } from "../../src/modules/issues/schemas/issue-status";
import {
  changeRedmineIssueStatus,
  getRedmineIssueStatus,
  RedmineRequestError,
} from "../../src/modules/redmine/helpers/redmine-api";
import { parseTheme } from "../../src/shared/schemas/theme";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
process.env.REDMINE_BASE_URL = "https://redmine.synthetic.test";
process.env.IRON_SESSION_PASSWORD = "synthetic-test-secret-at-least-32-characters";
const status = (id: number) => ({ id, name: `Status ${id}` });
const detail = (id = 1) => ({
  issue: { id: 42, status: status(id), allowed_statuses: [status(1), status(2)] },
});

test("old preferences keep saved criteria and receive board defaults", () => {
  const savedFilters = [
    { id: "old", name: "Saved", filters: [{ field: "status_id", operator: "o" }] },
  ];
  const result = preferencesSchema.parse({ version: 1, pageSize: 25, savedFilters });
  assert.equal(result.view, "list");
  assert.equal(result.boardProjectId, null);
  assert.deepEqual(result.savedFilters, savedFilters);
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("invalid"), "light");
});

test("status changes reject unknown attributes and invalid identifiers", () => {
  for (const input of [
    { statusId: 0, expectedStatusId: 1 },
    { statusId: "2", expectedStatusId: 1 },
    { statusId: 2, expectedStatusId: 1, subject: "unsafe" },
  ])
    assert.equal(issueStatusChangeSchema.safeParse(input).success, false);
});

test("normal account uses allowed_statuses, PUT and an empty 204 before verifying", async () => {
  const methods: string[] = [];
  let current = 1;
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("X-Redmine-API-Key"), "normal-key");
    methods.push(init?.method ?? "GET");
    if (init?.method === "PUT") {
      assert.deepEqual(JSON.parse(String(init.body)), { issue: { status_id: 2 } });
      current = 2;
      return new Response(null, { status: 204 });
    }
    assert.match(String(input), /issues\/42.json\?include=allowed_statuses$/);
    return Response.json(detail(current));
  };
  const result = await changeRedmineIssueStatus("normal-key", 42, {
    statusId: 2,
    expectedStatusId: 1,
  });
  assert.equal(result.statusId, 2);
  assert.deepEqual(methods, ["GET", "PUT", "GET"]);
});

test("stale and forbidden transitions never write", async () => {
  let writes = 0;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "PUT") writes++;
    return Response.json(detail());
  };
  for (const [input, failure] of [
    [{ statusId: 2, expectedStatusId: 3 }, "conflict"],
    [{ statusId: 3, expectedStatusId: 1 }, "transition"],
  ] as const)
    await assert.rejects(
      () => changeRedmineIssueStatus("key", 42, input),
      (error: unknown) => error instanceof RedmineRequestError && error.failure === failure,
    );
  assert.equal(writes, 0);
});

test("missing transitions remain read-only and mismatched detail IDs fail closed", async () => {
  globalThis.fetch = async () => Response.json({ issue: { id: 42, status: status(1) } });
  assert.deepEqual((await getRedmineIssueStatus("key", 42)).allowedStatuses, []);
  await assert.rejects(() => getRedmineIssueStatus("key", 43));
  await assert.rejects(
    () => changeRedmineIssueStatus("key", 42, { statusId: 2, expectedStatusId: 1 }),
    (error: unknown) => error instanceof RedmineRequestError && error.failure === "transition",
  );
});

for (const code of [403, 409, 422])
  test(`preserves Redmine's definitive update rejection ${code}`, async () => {
    globalThis.fetch = async (_input, init) =>
      init?.method === "PUT"
        ? Response.json({ errors: ["Required\u0000 field"] }, { status: code })
        : Response.json(detail());
    await assert.rejects(
      () => changeRedmineIssueStatus("key", 42, { statusId: 2, expectedStatusId: 1 }),
      (error: unknown) =>
        error instanceof RedmineRequestError &&
        error.failure !== "update_unknown" &&
        (code !== 422 || error.messages[0] === "Required  field"),
    );
  });

test("a lost write response or an unconfirmed resulting status requires verification without replay", async () => {
  for (const loseResponse of [true, false]) {
    let writes = 0;
    globalThis.fetch = async (_input, init) => {
      if (init?.method === "PUT") {
        writes++;
        if (loseResponse) throw new Error("lost response");
        return new Response(null, { status: 204 });
      }
      return Response.json(detail());
    };
    await assert.rejects(
      () => changeRedmineIssueStatus("key", 42, { statusId: 2, expectedStatusId: 1 }),
      (error: unknown) =>
        error instanceof RedmineRequestError && error.failure === "update_unknown",
    );
    assert.equal(writes, 1);
  }
});
