import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { runDiagnostics } from "../../src/modules/diagnostics/helpers/run-diagnostics";
import {
  diagnosticQuerySchema,
  diagnosticReportSchema,
} from "../../src/modules/diagnostics/schemas/diagnostics";
import { RedmineRequestError } from "../../src/modules/redmine/helpers/redmine-api";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.REDMINE_BASE_URL = "https://redmine.synthetic.test";
});
process.env.REDMINE_BASE_URL = "https://redmine.synthetic.test/subpath";
process.env.IRON_SESSION_PASSWORD = "synthetic-test-secret-at-least-32-characters";
function body(path: string) {
  if (path.includes("users/current"))
    return { user: { id: 1, login: "private-login", api_key: "private-key" } };
  if (path.includes("projects.json")) return { projects: [{ id: 1, name: "Private project" }] };
  if (path.includes("issues.json"))
    return { issues: [{ id: 1, subject: "Private subject" }], total_count: 1, offset: 0, limit: 1 };
  if (path.includes("projects/"))
    return { project: { id: 1, trackers: [], issue_categories: [], issue_custom_fields: [] } };
  if (path.includes("priorities")) return { issue_priorities: [] };
  throw new Error("Unexpected probe");
}
test("diagnostics only reads fixed routes and exports sanitized results", async () => {
  process.env.REDMINE_BASE_URL = "https://redmine.synthetic.test/subpath";
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = String(url);
    calls.push(path);
    assert.equal(options?.method, "GET");
    assert.equal(options?.body, undefined);
    assert.equal(options?.cache, "no-store");
    assert.equal(options?.redirect, "error");
    assert.ok(path.startsWith("https://redmine.synthetic.test/subpath/"));
    return Response.json(body(path));
  };
  const report = await runDiagnostics("private-key", 1, 1);
  assert.equal(calls.length, 5);
  assert.ok(calls.every((path) => !path.includes("custom_fields.json")));
  assert.ok(calls.some((path) => path.includes("issues.json?project_id=1&limit=1")));
  assert.ok(report.results.every((r) => r.state === "ok" && r.compatible && r.httpStatus === 200));
  assert.equal(report.creationPermission, "unchecked");
  assert.doesNotMatch(
    JSON.stringify(report),
    /private-key|private-login|Private subject|Private project|api_key/,
  );
  assert.equal(diagnosticReportSchema.safeParse(report).success, true);
});
test("diagnostics preserves mixed restricted unavailable server and incompatible results", async () => {
  let index = 0;
  const statuses = [200, 403, 503, 404, 501];
  globalThis.fetch = async (url) => {
    const status = statuses[index++];
    return Response.json(body(String(url)), { status });
  };
  const report = await runDiagnostics("key", 1, 1);
  assert.deepEqual(
    report.results.map((r) => r.state),
    ["ok", "restricted", "connection", "unavailable", "unavailable"],
  );
  assert.deepEqual(
    report.results.map((r) => r.httpStatus),
    statuses,
  );
});
test("malformed JSON and wrong identities cannot be reported as compatible", async () => {
  globalThis.fetch = async (url) =>
    String(url).includes("users/current")
      ? Response.json({ user: { id: 2, login: "other" } })
      : String(url).includes("projects/")
        ? Response.json({ project: { id: 2 } })
        : new Response("not JSON");
  const report = await runDiagnostics("key", 1, 1);
  assert.ok(report.results.every((r) => r.state === "incompatible" && r.compatible === false));
});
test("network failures retain partial report without leaking exceptions", async () => {
  globalThis.fetch = async () => {
    throw new Error("private-key and internal connection details");
  };
  const report = await runDiagnostics("private-key", 1, 1);
  assert.ok(report.results.every((r) => r.state === "connection" && r.httpStatus === null));
  assert.doesNotMatch(JSON.stringify(report), /private-key|internal connection/);
});
test("401 stops subsequent probes and discards the report", async () => {
  let calls = 0;
  globalThis.fetch = async (url) =>
    ++calls === 2 ? Response.json({}, { status: 401 }) : Response.json(body(String(url)));
  await assert.rejects(
    () => runDiagnostics("key", 1, 1),
    (e: unknown) => e instanceof RedmineRequestError && e.failure === "unauthorized",
  );
  assert.equal(calls, 2);
});
test("diagnostic query rejects duplicate-style arrays unsafe IDs and extra parameters", () => {
  for (const projectId of ["", "0", "-1", "1.5", "1e2", "Infinity", "9007199254740992"])
    assert.equal(diagnosticQuerySchema.safeParse({ projectId }).success, false);
  assert.equal(diagnosticQuerySchema.safeParse({ projectId: ["1", "2"] }).success, false);
  assert.equal(
    diagnosticQuerySchema.safeParse({ projectId: "1", url: "https://other.test" }).success,
    false,
  );
  assert.equal(diagnosticQuerySchema.parse({ projectId: "1" }).projectId, 1);
});
