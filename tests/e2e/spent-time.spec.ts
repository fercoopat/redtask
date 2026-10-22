import { expect, type Page, test } from "@playwright/test";

const fixture = "http://127.0.0.1:3219/__control";

async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#apiKey").fill("synthetic-A");
  await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
}

test.beforeEach(async ({ request }) => {
  await request.post(fixture, { data: { reset: true } });
});

test("spent-time charts render accessible SVG and switch their distribution", async ({ page }) => {
  await page.route("**/api/spent-time?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const from = params.get("from")!;
    const to = params.get("to")!;
    await route.fulfill({
      status: 200,
      headers: { "Cache-Control": "no-store" },
      json: {
        filters: { from, to },
        entries: [
          {
            id: 41,
            spentOn: from,
            hours: 1.5,
            project: { id: 1, name: "Project One" },
            activity: { id: 2, name: "Development" },
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 25,
        totalHours: 1.5,
        trend: { period: "daily", buckets: [{ period: from, hours: 1.5 }] },
        distribution: {
          projects: [{ id: 1, name: "Project One", hours: 1.5 }],
          activities: [{ id: 2, name: "Development", hours: 1.5 }],
        },
        projects: [{ id: 1, name: "Project One" }],
        activities: [{ id: 2, name: "Development" }],
      },
    });
  });

  await login(page);
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page
    .getByRole("navigation", { name: "Navegación" })
    .getByRole("link", { name: "Mi tiempo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/spent-time$/);
  await expect(page.getByRole("heading", { name: "Tiempo dedicado", level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: "Tendencia de horas" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Distribución de horas Por proyecto" })).toBeVisible();
  await expect(page.getByText("Project One: 1,5 horas")).toBeVisible();
  await page.getByRole("button", { name: "Por actividad", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Distribución de horas Por actividad" }),
  ).toBeVisible();
});
