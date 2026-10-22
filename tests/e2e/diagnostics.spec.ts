import { readFile } from "node:fs/promises";

import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

const fixture = "http://127.0.0.1:3219/__control";
const control = (request: APIRequestContext, data: object) => request.post(fixture, { data });
async function login(page: Page, key = "synthetic-A") {
  await page.goto("/login");
  await page.locator("#apiKey").fill(key);
  await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  const diagnosticLink = page
    .getByRole("navigation", { name: "Navegación" })
    .getByRole("link", { name: "Diagnóstico", exact: true });
  await expect(diagnosticLink).toBeVisible();
  await diagnosticLink.click();
  await expect(page).toHaveURL(/\/diagnostics$/);
  await page.locator("#diagnostic-project").selectOption("1");
}
const run = (page: Page) =>
  page.getByRole("button", { name: "Ejecutar diagnóstico", exact: true }).click();
const results = (page: Page) => page.getByRole("region", { name: "Resultados del diagnóstico" });
test.beforeEach(async ({ request }) => {
  await control(request, { reset: true });
});
test("diagnostics is protected and validates its query", async ({ page }) => {
  expect((await page.request.get("/api/diagnostics?projectId=1")).status()).toBe(401);
  await page.goto("/diagnostics");
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  for (const query of [
    "",
    "?projectId=0",
    "?projectId=1&projectId=2",
    "?projectId=1&url=https://other.test",
  ])
    expect((await page.request.get(`/api/diagnostics${query}`)).status()).toBe(400);
});
test("manual diagnostics preserves partial failures and exports no private data", async ({
  page,
  request,
}) => {
  await login(page);
  await expect(results(page)).not.toBeVisible();
  await control(request, { listStatus: 503, prioritiesStatus: 404 });
  await control(request, { readRequests: [] });
  await run(page);
  await expect(results(page)).toBeVisible();
  await expect(results(page).getByRole("row")).toHaveCount(6);
  await expect(results(page)).toContainText("Fallo de conexión o servidor");
  await expect(results(page)).toContainText("Endpoint no disponible");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar informe JSON" }).click();
  const download = await downloadPromise;
  const report = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(report.userId).toBe(1);
  expect(report.projectId).toBe(1);
  expect(report.creationPermission).toBe("unchecked");
  expect(report.results).toHaveLength(5);
  expect(JSON.stringify(report)).not.toMatch(/synthetic-A|PRIVATE-|user-1|Project One/);
  const stats = await (await request.get(fixture)).json();
  expect(stats.readRequests.every((r: { method: string }) => r.method === "GET")).toBe(true);
  expect(stats.readRequests.every((r: { path: string }) => r.path !== "/custom_fields.json")).toBe(
    true,
  );
  expect(stats.creates).toHaveLength(0);
  await page.locator("#diagnostic-project").selectOption("2");
  await expect(results(page)).not.toBeVisible();
});
test("running diagnostics disables controls and never repeats automatically", async ({
  page,
  request,
}) => {
  await login(page);
  await control(request, { holdOptions: true, readRequests: [] });
  await run(page);
  await expect(page.locator("#diagnostic-project")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Comprobando…" })).toBeDisabled();
  await control(request, { release: "options", holdOptions: false });
  await expect(results(page)).toBeVisible();
  const stats = await (await request.get(fixture)).json();
  expect(stats.readRequests).toHaveLength(5);
});
test("revoked diagnostics ends the session and removes the previous report", async ({
  page,
  request,
}) => {
  await login(page);
  await run(page);
  await expect(results(page)).toBeVisible();
  await control(request, { revoked: true });
  await run(page);
  await expect(page).toHaveURL(/\/login$/);
  await expect(results(page)).not.toBeVisible();
});
test("diagnostic reports are isolated between accounts", async ({ page }) => {
  await login(page);
  await run(page);
  await expect(results(page)).toContainText("Cuenta #1");
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page.getByRole("link", { name: "Incidencias", exact: true }).click();
  await page.getByRole("button", { name: "Cerrar sesión de Redmine" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "synthetic-B");
  await expect(results(page)).not.toBeVisible();
  await run(page);
  await expect(results(page)).toContainText("Cuenta #2");
  await expect(results(page)).not.toContainText("Cuenta #1");
});
