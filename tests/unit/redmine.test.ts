import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  createRedmineIssue,
  getRedmineIssueCreateOptions,
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
