import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { sealData, unsealData } from "iron-session";

import { browserTestSessionPassword } from "../../playwright.config";

const fixture = "http://127.0.0.1:3219/__control";
const control = (request: APIRequestContext, patch: object) =>
  request.post(fixture, { data: patch });
const stats = async (request: APIRequestContext) => (await request.get(fixture)).json();
async function login(page: Page, key = "synthetic-A") {
  await page.goto("/login");
  await page.locator("#apiKey").fill(key);
  await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
}
async function draft(page: Page) {
  await page.getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await page.locator("#issue-project").selectOption("1");
  await expect(page.locator("#issue-tracker")).toBeVisible();
  await page.locator("#issue-tracker").selectOption("10");
  await page.locator("#issue-subject").fill("Synthetic issue");
}
const form = (page: Page) => page.getByRole("form", { name: "Crear incidencia", exact: true });
test.beforeEach(async ({ request }) => {
  await control(request, { reset: true });
});
test.afterEach(async ({ request }) => {
  const { readRequests } = await stats(request);
  expect(readRequests.every((r: { path: string }) => r.path !== "/custom_fields.json")).toBe(true);
});

test("expired session rejects creation before reaching Redmine and removes the private draft", async ({
  page,
  request,
}) => {
  await login(page);
  await draft(page);
  const cookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === "redmine-ui-session",
  );
  expect(cookie).toBeDefined();
  const session = await unsealData<{
    apiKey: string;
    userId: number;
    login: string;
    expiresAt: number;
  }>(cookie!.value, { password: browserTestSessionPassword });
  expect(session.apiKey).toBe("synthetic-A");
  expect(session.expiresAt).toBeGreaterThan(Date.now());
  expect((await page.request.get("/api/issues/create-options?projectId=1")).status()).toBe(200);
  const value = await sealData(
    { ...session, expiresAt: Date.now() - 1_000 },
    { password: browserTestSessionPassword },
  );
  await page.context().addCookies([{ ...cookie!, value }]);
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/issues" && response.request().method() === "POST",
  );
  await form(page).getByRole("button", { name: "Crear incidencia", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe("session_required");
  expect(await response.headerValue("set-cookie")).toMatch(
    /redmine-ui-session=;[^\r\n]*Max-Age=0/i,
  );
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((cookie) => cookie.name === "redmine-ui-session"),
    )
    .toBe(false);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#issue-subject")).not.toBeVisible();
  const state = await stats(request);
  expect(state.creates).toHaveLength(0);
  expect(
    state.readRequests.some(
      (request: { method: string; path: string }) =>
        request.method === "POST" && request.path === "/issues.json",
    ),
  ).toBe(false);
});

test("blank API key reports an accessible local error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#apiKey").fill("   ");
  await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
  await expect(page.locator("#apiKey")).toHaveAttribute("aria-describedby", "apiKey-error");
  await expect(page.locator("#apiKey-error")).toHaveText("Ingresa tu API Key.");
  await expect(page).toHaveURL(/\/login$/);
});
test("initial list outage is visible and retry recovers", async ({ page, request }) => {
  await control(request, { listStatus: 503 });
  await login(page);
  await expect(page.locator(".alert-warning")).toContainText("No se pudo conectar con Redmine");
  await expect(page.getByText("Cargando incidencias…")).not.toBeVisible();
  await control(request, { listStatus: 200 });
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
});
test("shows an accessible spinner while filtered issue results load", async ({ page, request }) => {
  await control(request, { holdList: true });
  await login(page);
  await expect(page.getByRole("status").filter({ hasText: "Cargando incidencias…" })).toBeVisible();
  await expect(page.locator(".loading-spinner")).toBeVisible();
  await expect.poll(async () => (await stats(request)).listRequests.length).toBeGreaterThan(0);
  await control(request, { holdList: false, release: "list" });
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  await control(request, { holdList: true });
  await page.getByText("Filtros", { exact: true }).click();
  await page.locator("#filter-field").selectOption("done_ratio");
  await page.locator("#filter-value").fill("50");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator(".loading-spinner")).toBeVisible();
  await expect.poll(async () => (await stats(request)).listRequests.length).toBeGreaterThan(1);
  await control(request, { holdList: false, release: "list" });
  await expect(page.getByText("Actualizando incidencias…")).not.toBeVisible();
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
});
test("account switch cannot reuse previous account data or late responses", async ({
  page,
  request,
}) => {
  await login(page);
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  await control(request, { holdList: true });
  await page.getByLabel("Incidencias por página").selectOption("25");
  await expect.poll(async () => (await stats(request)).listRequests.length).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Cerrar sesión de Redmine" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await control(request, { holdList: false });
  await login(page, "synthetic-B");
  await expect(page.getByText("PRIVATE-2", { exact: true })).toBeVisible();
  await control(request, { release: "list" });
  await expect(page.getByText("PRIVATE-1", { exact: true })).not.toBeVisible();
  await expect(page.getByText("PRIVATE-2", { exact: true })).toBeVisible();
});
test("stock project metadata renders fields and local errors under inputs", async ({
  page,
  request,
}) => {
  await login(page);
  await draft(page);
  await page.locator("#issue-subject").fill("");
  await page.locator("#issue-tracker").selectOption("");
  await form(page).getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect(page.locator("#issue-subject-error")).toHaveText("Este campo es obligatorio.");
  await expect(page.locator("#issue-tracker")).toHaveAttribute(
    "aria-describedby",
    "issue-tracker-error",
  );
  await expect(page.locator("#issue-custom-field-9")).toBeVisible();
  expect((await stats(request)).creates).toHaveLength(0);
});
test("project change keeps text and clears project-owned fields", async ({ page, request }) => {
  await login(page);
  await draft(page);
  await page.locator("#issue-description").fill("Keep description");
  await page.locator("#issue-category").selectOption("100");
  await page.locator("#issue-custom-field-9").fill("Stale");
  await page.locator("#issue-priority").selectOption("1");
  await page.locator("#issue-project").selectOption("2");
  await expect(page.locator("#issue-custom-field-18")).toBeVisible();
  await expect(page.locator("#issue-subject")).toHaveValue("Synthetic issue");
  await expect(page.locator("#issue-description")).toHaveValue("Keep description");
  await expect(page.locator("#issue-tracker")).toHaveValue("");
  await expect(page.locator("#issue-category")).toHaveValue("");
  await expect(page.locator("#issue-custom-field-18")).toHaveValue("");
  await page.locator("#issue-tracker").selectOption("20");
  await page.locator("#issue-custom-field-18").fill("Current");
  await form(page).getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect(page.getByText("Incidencia #1001: Synthetic issue", { exact: false })).toBeVisible();
  const payload = (await stats(request)).creates[0].issue;
  expect(payload.custom_fields).toEqual([{ id: 18, value: "Current" }]);
  expect(payload.category_id).toBeUndefined();
});
test("pending creation protects the draft and prevents duplicate writes", async ({
  page,
  request,
}) => {
  await control(request, { createMode: "hold" });
  await login(page);
  await draft(page);
  await form(page).getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect.poll(async () => (await stats(request)).creates.length).toBe(1);
  await expect(page.getByRole("button", { name: "Cerrar panel", exact: true })).toBeEnabled();
  await expect(page.locator("#issue-subject")).toBeDisabled();
  await form(page).dispatchEvent("submit");
  await form(page).dispatchEvent("submit");
  await expect(form(page).getByRole("button", { name: "Creando…", exact: true })).toBeDisabled();
  await control(request, { release: "create" });
  await expect(page.getByText("Incidencia #1001: Synthetic issue", { exact: false })).toBeVisible();
  expect((await stats(request)).creates).toHaveLength(1);
});
test("unknown creation retains its acknowledgment guard across hide/reopen", async ({
  page,
  request,
}) => {
  await control(request, { createMode: "unknown" });
  await login(page);
  await draft(page);
  await form(page).getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect(form(page).getByRole("button", { name: "Reintentar creación" })).toBeDisabled();
  await expect(
    page.getByText("No se pudo confirmar el resultado.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar panel", exact: true }).click();
  await page.getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect(page.locator("#issue-subject")).toHaveValue("Synthetic issue");
  await expect(form(page).getByRole("button", { name: "Reintentar creación" })).toBeDisabled();
  expect((await stats(request)).creates).toHaveLength(1);
  await control(request, { createMode: "success" });
  await page.getByLabel("He comprobado Redmine y quiero reintentar.").check();
  await form(page).getByRole("button", { name: "Reintentar creación" }).click();
  await expect(page.getByText("Incidencia #1002: Synthetic issue", { exact: false })).toBeVisible();
});
test("priority outage blocks creation and retry recovers", async ({ page, request }) => {
  await control(request, { prioritiesStatus: 503 });
  await login(page);
  await page.getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await page.locator("#issue-project").selectOption("1");
  await expect(form(page).getByRole("alert")).toBeVisible();
  await expect(
    form(page).getByRole("button", { name: "Crear incidencia", exact: true }),
  ).toBeDisabled();
  await control(request, { prioritiesStatus: 200 });
  await form(page).getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.locator("#issue-tracker")).toBeVisible();
  await expect(
    form(page).getByRole("button", { name: "Crear incidencia", exact: true }),
  ).toBeEnabled();
});
for (const mode of ["forbidden", "validation"])
  test(`creation ${mode} preserves the editable draft`, async ({ page, request }) => {
    await control(request, { createMode: mode });
    await login(page);
    await draft(page);
    await form(page).getByRole("button", { name: "Crear incidencia", exact: true }).click();
    await expect(form(page).getByRole("alert")).toContainText(
      mode === "forbidden" ? "Tu cuenta no tiene permiso" : "Redmine rechazó algunos campos",
    );
    await expect(page.locator("#issue-subject")).toBeEnabled();
    await expect(page.locator("#issue-subject")).toHaveValue("Synthetic issue");
  });
test("invalid numeric filter shows linked error and never reaches Redmine", async ({
  page,
  request,
}) => {
  await login(page);
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  const count = (await stats(request)).listRequests.length;
  await page.getByText("Filtros", { exact: true }).click();
  await page.locator("#filter-field").selectOption("done_ratio");
  await expect(page.locator("#filter-operator")).toContainText("mayor o igual que");
  await page.locator("#filter-value").fill("101");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await expect(page.locator("#filter-value")).toHaveAttribute(
    "aria-describedby",
    "filter-value-error",
  );
  await expect(page.locator("#filter-value-error")).toHaveText(
    "El valor no es válido para este filtro.",
  );
  expect((await stats(request)).listRequests).toHaveLength(count);
});
test("legacy saved filters remain reviewable without sending an invalid query", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await page.evaluate(() =>
    localStorage.setItem(
      "redmine-ui:issues:v1:http%3A%2F%2F127.0.0.1%3A3219:1",
      JSON.stringify({
        version: 1,
        pageSize: 10,
        visibleFields: ["done_ratio"],
        savedFilters: [
          {
            id: "legacy",
            name: "Legacy",
            filters: [{ field: "done_ratio", operator: ">", value: "50" }],
          },
        ],
      }),
    ),
  );
  await login(page);
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  await page.getByText("Filtros", { exact: true }).click();
  await page.getByLabel("Filtros guardados", { exact: true }).selectOption("legacy");
  await expect(page.getByRole("button", { name: "Aplicar", exact: true })).toBeDisabled();
  const count = (await stats(request)).listRequests.length;
  await page.getByRole("button", { name: "Editar criterios", exact: true }).click();
  await expect(page.getByText("Uno o más filtros no son válidos", { exact: false })).toBeVisible();
  expect((await stats(request)).listRequests).toHaveLength(count);
  await page.getByRole("button", { name: "Editar filtro Progreso (%)" }).click();
  await page.locator("#filter-operator").selectOption(">=");
  await page.locator("#filter-value").fill("50");
  await page.getByRole("button", { name: "Guardar cambio", exact: true }).click();
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      (await stats(request)).listRequests.some((value: string) => value.includes("%3E%3D")),
    )
    .toBe(true);
});
test("revoked metadata request ends the session and removes private UI", async ({
  page,
  request,
}) => {
  await login(page);
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  await control(request, { revoked: true });
  await page.getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("PRIVATE-1", { exact: true })).not.toBeVisible();
});
test("API rejects cross-origin writes and does not expose credentials", async ({ page }) => {
  await login(page);
  const response = await page.request.post("/api/issues", {
    headers: { Origin: "https://foreign.synthetic.test" },
    data: { projectId: 1, subject: "Blocked" },
  });
  expect(response.status()).toBe(403);
  expect(await response.text()).not.toContain("synthetic-A");
  const data = await page.request.get("/api/issues");
  expect(data.headers()["cache-control"]).toContain("no-store");
  expect(await data.text()).not.toContain("synthetic-A");
});

test("slow project options disable submission and ignore a previous project's response", async ({
  page,
  request,
}) => {
  await control(request, { holdOptions: true });
  await login(page);
  await page.getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await page.locator("#issue-project").selectOption("1");
  await expect(page.getByText("Cargando campos del proyecto…")).toBeVisible();
  await expect(
    form(page).getByRole("button", { name: "Crear incidencia", exact: true }),
  ).toBeDisabled();
  await page.locator("#issue-project").selectOption("2");
  await control(request, { holdOptions: false, release: "options" });
  await expect(page.locator("#issue-custom-field-18")).toBeVisible();
  await expect(page.locator("#issue-custom-field-9")).not.toBeVisible();
  await expect(page.locator("#issue-project")).toHaveValue("2");
});
test("optional priorities absence still allows creation", async ({ page, request }) => {
  await control(request, { prioritiesStatus: 404 });
  await login(page);
  await page.getByText("Filtros", { exact: true }).click();
  await page.locator("#filter-field").selectOption("priority_id");
  await expect(page.getByText("No hay opciones disponibles para este filtro.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Añadir", exact: true })).toBeDisabled();
  await draft(page);
  await expect(page.locator("#issue-priority")).not.toBeVisible();
  await form(page).getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect(page.getByText("Incidencia #1001: Synthetic issue", { exact: false })).toBeVisible();
});
test("compiled CSS includes every shared alert and button variant", async ({ page }) => {
  await page.goto("/login");
  const selectors = await page.evaluate(() => {
    const found = new Set<string>();
    const visit = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if ("selectorText" in rule) found.add(String(rule.selectorText));
        if ("cssRules" in rule) visit((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        visit(sheet.cssRules);
      } catch {
        /* Ignore third-party sheets. */
      }
    }
    return [...found].join("\n");
  });
  for (const name of [
    "alert-info",
    "alert-success",
    "alert-warning",
    "alert-error",
    "btn-primary",
    "btn-outline",
    "btn-ghost",
    "btn-error",
    "btn-xs",
    "btn-sm",
  ])
    expect(selectors).toContain(`.${name}`);
});
test("English numeric filter conditions are localized correctly", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Preferencias de cuenta" }).click();
  await page.getByLabel("Idioma", { exact: true }).selectOption("en");
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByText("Filters", { exact: true }).click();
  await page.locator("#filter-field").selectOption("estimated_hours");
  await expect(page.locator("#filter-operator")).toContainText("greater than or equal to");
  await expect(page.locator("#filter-operator")).toContainText("less than or equal to");
});

test("failed logout keeps the current session usable", async ({ page }) => {
  await login(page);
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  await page.route("**/api/auth/session", async (route) => {
    if (route.request().method() === "DELETE")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "logout_failed" } }),
      });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Cerrar sesión de Redmine" }).click();
  await expect(page.locator(".alert-error")).toContainText("No se pudo cerrar la sesión");
  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
});
test("revoked creation request removes the private draft and returns to login", async ({
  page,
  request,
}) => {
  await login(page);
  await draft(page);
  await control(request, { revoked: true });
  await form(page).getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#issue-subject")).not.toBeVisible();
});

test("standard filter catalog avoids administrator endpoints and detects revoked keys", async ({
  page,
  request,
}) => {
  await login(page);
  const response = await page.request.get("/api/issues/filters");
  expect(response.status()).toBe(200);
  const catalog = await response.json();
  expect(catalog.fields.length).toBeGreaterThan(0);
  expect(catalog.fields.every((field: { field: string }) => !field.field.startsWith("cf_"))).toBe(
    true,
  );
  expect(
    (await stats(request)).readRequests.every(
      (r: { path: string }) => r.path !== "/custom_fields.json",
    ),
  ).toBe(true);
  await control(request, { revoked: true });
  const revoked = await page.request.get("/api/issues/filters");
  expect(revoked.status()).toBe(401);
  expect((await revoked.json()).error.code).toBe("api_key_revoked");
  expect((await page.request.get("/api/issues")).status()).toBe(401);
});
test("saved custom criteria stay reviewable and are rejected without widening the query", async ({
  page,
  request,
}) => {
  const preferenceKey = "redmine-ui:issues:v1:http%3A%2F%2F127.0.0.1%3A3219:1";
  await page.goto("/login");
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          pageSize: 10,
          visibleFields: ["subject"],
          savedFilters: [
            {
              id: "custom",
              name: "Saved custom",
              filters: [{ field: "cf_9", operator: "~", value: "Preserved" }],
            },
          ],
        }),
      ),
    preferenceKey,
  );
  await login(page);
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  await page.getByText("Filtros", { exact: true }).click();
  await page.getByLabel("Filtros guardados", { exact: true }).selectOption("custom");
  await expect(page.getByRole("button", { name: "Aplicar", exact: true })).toBeDisabled();
  const before = await stats(request);
  await page.getByRole("button", { name: "Editar criterios", exact: true }).click();
  await expect(page.getByText("Uno o más filtros no son válidos", { exact: false })).toBeVisible();
  const rejected = await page.request.get(
    "/api/issues?filter[cf_9][operator]=~&filter[cf_9][value]=Preserved",
  );
  expect(rejected.status()).toBe(400);
  expect((await rejected.json()).error.code).toBe("custom_fields_unavailable");
  const after = await stats(request);
  expect(after.listRequests).toEqual(before.listRequests);
  expect(after.readRequests.every((r: { path: string }) => r.path !== "/custom_fields.json")).toBe(
    true,
  );
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).savedFilters,
    preferenceKey,
  );
  expect(stored[0].filters).toEqual([{ field: "cf_9", operator: "~", value: "Preserved" }]);
});

test("folding filters preserves drafts and editing an active criterion opens and focuses the editor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await login(page);
  await expect(page.getByText("PRIVATE-1", { exact: true })).toBeVisible();
  const toggle = page.getByText("Filtros", { exact: true });
  await expect(page.getByRole("form", { name: "Añadir filtro de incidencias" })).not.toBeVisible();
  await toggle.click();
  await page.getByLabel("Campo", { exact: true }).selectOption("subject");
  await page.getByLabel("Valor", { exact: true }).fill("Mi borrador");
  await toggle.click();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Valor", { exact: true })).toHaveValue("Mi borrador");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Editar filtro Asunto", exact: true }),
  ).toBeEnabled();
  await toggle.click();
  await page.getByRole("button", { name: "Editar filtro Asunto", exact: true }).click();
  await expect(page.getByLabel("Campo", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Valor", { exact: true })).toHaveValue("Mi borrador");
  await toggle.click();
  await page.getByRole("button", { name: "Quitar filtro Asunto", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editar filtro Asunto", exact: true })).toHaveCount(
    0,
  );
});
