import { expect, test } from "@playwright/test";

import { fixture } from "./fixture";
for (const user of ["creator", "reader"] as const) {
  test(`read-only diagnostics with real ${user} account`, async ({ page }) => {
    await page.goto("/login");
    await page.locator("#apiKey").fill(fixture.users[user].apiKey);
    await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
    await expect(page).toHaveURL(/\/issues$/);
    await page.getByRole("link", { name: "Diagnóstico", exact: true }).click();
    await page.locator("#diagnostic-project").selectOption(String(fixture.projects[0].id));
    const responsePromise = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/diagnostics",
    );
    await page.getByRole("button", { name: "Ejecutar diagnóstico" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const report = await response.json();
    expect(report.userId).toBe(fixture.users[user].id);
    expect(report.creationPermission).toBe("unchecked");
    expect(report.results).toHaveLength(5);
    expect(report.results.every((r: { state: string }) => r.state === "ok")).toBe(true);
    expect(report.results.some((r: { id: string }) => r.id === "customFields")).toBe(false);
    expect(JSON.stringify(report)).not.toContain(fixture.users[user].apiKey);
    await expect(page.getByRole("region", { name: "Resultados del diagnóstico" })).toBeVisible();
  });
}
