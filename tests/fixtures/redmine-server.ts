import { createServer, type ServerResponse } from "node:http";

// Only the loopback fixture exposes controls; the application has no test routes.
let state = defaults();
function defaults() {
  return {
    listStatus: 200,
    prioritiesStatus: 200,
    createMode: "success",
    holdList: false,
    holdOptions: false,
    revoked: false,
    creates: [] as unknown[],
    listRequests: [] as string[],
    readRequests: [] as { method: string; path: string }[],
  };
}
const pendingCreates: (() => void)[] = [];
const pendingLists: (() => void)[] = [];
const pendingOptions: (() => void)[] = [];
function send(response: ServerResponse, body: unknown, status = 200) {
  if (!response.destroyed) {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  }
}
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3219");
  if (url.pathname === "/__health") return send(response, { ok: true });
  if (url.pathname === "/__control") {
    if (request.method === "GET") return send(response, state);
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const { reset, release, ...patch } = JSON.parse(raw || "{}");
    if (reset) {
      pendingCreates.splice(0).forEach((finish) => finish());
      pendingLists.splice(0).forEach((finish) => finish());
      pendingOptions.splice(0).forEach((finish) => finish());
      state = defaults();
    }
    Object.assign(state, patch);
    if (release === "create") pendingCreates.splice(0).forEach((finish) => finish());
    if (release === "list") pendingLists.splice(0).forEach((finish) => finish());
    if (release === "options") pendingOptions.splice(0).forEach((finish) => finish());
    return send(response, { ok: true });
  }
  state.readRequests.push({ method: request.method ?? "", path: url.pathname });
  const key = request.headers["x-redmine-api-key"];
  if (state.revoked || (key !== "synthetic-A" && key !== "synthetic-B"))
    return send(response, {}, 401);
  const userId = key === "synthetic-A" ? 1 : 2;
  if (url.pathname === "/users/current.json")
    return send(response, {
      user: { id: userId, login: `user-${userId}`, firstname: "Test", lastname: "Account" },
    });
  if (url.pathname === "/custom_fields.json") return send(response, {}, 403);
  if (url.pathname === "/projects.json")
    return send(response, {
      projects: [
        { id: 1, name: "Project One" },
        { id: 2, name: "Project Two" },
      ],
    });
  if (/^\/projects\/\d+\.json$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/")[2].split(".")[0]);
    const finish = () =>
      send(response, {
        project: {
          id,
          trackers: [{ id: id * 10, name: `Tracker ${id}` }],
          issue_categories: [{ id: id * 100, name: `Category ${id}` }],
          issue_custom_fields: [{ id: id * 9, name: `Custom ${id}` }],
        },
      });
    if (state.holdOptions) pendingOptions.push(finish);
    else finish();
    return;
  }
  if (url.pathname === "/enumerations/issue_priorities.json")
    return send(
      response,
      { issue_priorities: [{ id: 1, name: "Normal" }] },
      state.prioritiesStatus,
    );
  if (url.pathname === "/issues.json" && request.method === "POST") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    state.creates.push(body);
    if (state.createMode === "unknown") return response.destroy();
    if (state.createMode === "forbidden") return send(response, {}, 403);
    if (state.createMode === "validation")
      return send(response, { errors: ["Synthetic field validation"] }, 422);
    const id = 1000 + state.creates.length;
    const finish = () => send(response, { issue: { id, subject: body.issue.subject } }, 201);
    if (state.createMode === "hold") pendingCreates.push(finish);
    else finish();
    return;
  }
  if (url.pathname === "/issues.json") {
    state.listRequests.push(`${userId}:${url.search}`);
    const result = {
      issues: [
        {
          id: userId,
          subject: `PRIVATE-${userId}`,
          project: { id: 1, name: "Project One" },
          status: { id: 1, name: "New" },
          priority: { id: 1, name: "Normal" },
          updated_on: "2026-01-01T00:00:00Z",
        },
      ],
      total_count: 1,
      offset: 0,
      limit: Number(url.searchParams.get("limit")) || 10,
    };
    const status = state.listStatus;
    const finish = () => send(response, result, status);
    if (state.holdList) pendingLists.push(finish);
    else finish();
    return;
  }
  send(response, {}, 404);
});
server.listen(3219, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
