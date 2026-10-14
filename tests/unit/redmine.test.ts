import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  createRedmineIssue,
  getRedmineIssueCreateOptions,
  getRedmineIssueFilterFields,
  getRedmineIssues,
  RedmineRequestError,
} from "../../src/modules/redmine/helpers/redmine-api";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
process.env.REDMINE_BASE_URL = "https://redmine.synthetic.test";
process.env.IRON_SESSION_PASSWORD = "synthetic-test-secret-at-least-32-characters";
const project = {
  project: {
    id: 1,
    trackers: [{ id: 1, name: "Bug" }],
    issue_categories: [],
    issue_custom_fields: [{ id: 9, name: "Component" }],
  },
};

test("accepts stock Redmine project custom-field descriptors", async () => {
  globalThis.fetch = async (url) =>
    Response.json(String(url).includes("enumerations") ? { issue_priorities: [] } : project);
  const result = await getRedmineIssueCreateOptions("synthetic-key", 1);
  assert.equal(result.customFields[0].name, "Component");
  assert.equal(result.customFields[0].fieldFormat, undefined);
});

test("does not hide priority connection failures", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes("enumerations")) throw new Error("synthetic outage");
    return Response.json({ project: { ...project.project, issue_custom_fields: [] } });
  };
  await assert.rejects(
    () => getRedmineIssueCreateOptions("synthetic-key", 1),
    (error: unknown) => error instanceof RedmineRequestError && error.failure === "unavailable",
  );
});

for (const status of [404, 501])
  test(`priority endpoint ${status} is optional`, async () => {
    globalThis.fetch = async (url) =>
      String(url).includes("enumerations") ? Response.json({}, { status }) : Response.json(project);
    assert.deepEqual((await getRedmineIssueCreateOptions("synthetic-key", 1)).priorities, []);
  });
for (const status of [401, 403, 503])
  test(`priority endpoint ${status} remains an error`, async () => {
    globalThis.fetch = async (url) =>
      String(url).includes("enumerations") ? Response.json({}, { status }) : Response.json(project);
    await assert.rejects(
      () => getRedmineIssueCreateOptions("synthetic-key", 1),
      (error: unknown) => error instanceof RedmineRequestError && error.status === status,
    );
  });
test("malformed successful priorities are not hidden", async () => {
  globalThis.fetch = async (url) =>
    Response.json(String(url).includes("enumerations") ? { bad: true } : project);
  await assert.rejects(
    () => getRedmineIssueCreateOptions("synthetic-key", 1),
    (error: unknown) => error instanceof RedmineRequestError && error.failure === "unexpected",
  );
});
test("enriched optional metadata is preserved and requests are protected", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("X-Redmine-API-Key"), "synthetic-key");
    return Response.json(
      String(url).includes("enumerations")
        ? { issue_priorities: [] }
        : {
            project: {
              ...project.project,
              issue_custom_fields: [
                {
                  id: 9,
                  name: "Component",
                  field_format: "list",
                  is_required: true,
                  possible_values: ["Backend"],
                },
              ],
            },
          },
    );
  };
  const field = (await getRedmineIssueCreateOptions("synthetic-key", 1)).customFields[0];
  assert.equal(field.required, true);
  assert.deepEqual(field.possibleValues, [{ value: "Backend", label: "Backend" }]);
});

test("issue user filters combine paginated project memberships without global user access", async () => {
  const members = Array.from({ length: 101 }, (_, index) => ({
    user: { id: index + 1, name: `User ${String(index + 1).padStart(3, "0")}` },
  }));
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url.pathname + url.search);
    if (url.pathname === "/projects.json")
      return Response.json({
        projects: [
          { id: 1, name: "Project A" },
          { id: 2, name: "Project B" },
        ],
      });
    if (url.pathname === "/issue_statuses.json") return Response.json({ issue_statuses: [] });
    if (url.pathname === "/trackers.json") return Response.json({ trackers: [] });
    if (url.pathname === "/enumerations/issue_priorities.json")
      return Response.json({ issue_priorities: [] });
    if (url.pathname === "/projects/1/memberships.json") {
      const offset = Number(url.searchParams.get("offset"));
      return Response.json({
        memberships: members.slice(offset, offset + 100),
        total_count: members.length,
      });
    }
    if (url.pathname === "/projects/2/memberships.json")
      return Response.json({
        memberships: [{ user: { id: 1, name: "User 001" } }, { group: { id: 4, name: "Team" } }],
        total_count: 2,
      });
    assert.fail(`Unexpected Redmine request: ${url.pathname}`);
  };

  const fields = await getRedmineIssueFilterFields("synthetic-key");
  for (const fieldName of ["author_id", "assigned_to_id"]) {
    const field = fields.find((item) => item.field === fieldName);
    assert.equal(field?.values?.length, 101);
    assert.deepEqual(field?.values?.[0], { value: "1", label: "User 001" });
    assert.ok(field?.values?.some(({ value }) => value === "101"));
  }
  assert.ok(calls.includes("/projects/1/memberships.json?limit=100&offset=100"));
  assert.ok(calls.every((path) => path !== "/users.json"));
});

test("membership permission denial keeps other issue filters available", async () => {
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/projects.json") return Response.json({ projects: [{ id: 1, name: "Project" }] });
    if (path === "/issue_statuses.json")
      return Response.json({ issue_statuses: [{ id: 1, name: "Open" }] });
    if (path === "/trackers.json") return Response.json({ trackers: [] });
    if (path === "/enumerations/issue_priorities.json")
      return Response.json({ issue_priorities: [] });
    if (path === "/projects/1/memberships.json") return Response.json({}, { status: 403 });
    assert.fail(`Unexpected Redmine request: ${path}`);
  };

  const fields = await getRedmineIssueFilterFields("synthetic-key");
  assert.deepEqual(fields.find((item) => item.field === "status_id")?.values, [
    { value: "1", label: "Open" },
  ]);
  assert.equal(fields.find((item) => item.field === "assigned_to_id")?.values, undefined);
  assert.equal(fields.find((item) => item.field === "author_id")?.values, undefined);
});

test("creation sends only validated wire fields and returns a safe issue URL", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(String(url)).pathname, "/issues.json");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      issue: {
        project_id: 1,
        tracker_id: 10,
        subject: "Issue",
        custom_fields: [{ id: 9, value: "Value" }],
      },
    });
    return Response.json({ issue: { id: 123, subject: "Issue" } }, { status: 201 });
  };
  const result = await createRedmineIssue("synthetic-key", {
    projectId: 1,
    trackerId: 10,
    subject: " Issue ",
    customFields: [{ id: 9, value: "Value" }],
  });
  assert.equal(result.url, "https://redmine.synthetic.test/issues/123");
});
test("validation details are bounded and sanitized", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { errors: Array.from({ length: 15 }, () => "bad\u0000" + "x".repeat(400)) },
      { status: 422 },
    );
  await assert.rejects(
    () => createRedmineIssue("synthetic-key", { projectId: 1, subject: "Issue" }),
    (error: unknown) => {
      assert.ok(error instanceof RedmineRequestError);
      assert.equal(error.failure, "validation");
      assert.equal(error.messages.length, 10);
      assert.ok(
        error.messages.every((message) => message.length === 300 && !message.includes("\u0000")),
      );
      return true;
    },
  );
});
test("issue filters use encoded Redmine query parameters", async () => {
  globalThis.fetch = async (url) => {
    const params = new URL(String(url)).searchParams;
    assert.equal(params.get("op[done_ratio]"), ">=");
    assert.equal(params.get("v[done_ratio][]"), "50");
    assert.equal(params.get("offset"), "0");
    return Response.json({ issues: [], total_count: 0, offset: 0, limit: 10 });
  };
  assert.equal(
    (
      await getRedmineIssues("synthetic-key", {
        page: 1,
        pageSize: 10,
        filters: [{ field: "done_ratio", operator: ">=", value: "50" }],
      })
    ).totalCount,
    0,
  );
});
