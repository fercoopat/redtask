import { readFile } from "node:fs/promises";

import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

import { themes } from "../../src/shared/schemas/theme";

const fixture = "http://127.0.0.1:3219/__control";
const control = (request: APIRequestContext, data: object) => request.post(fixture, { data });
const stats = async (request: APIRequestContext) => (await request.get(fixture)).json();

async function login(page: Page, key = "synthetic-A") {
  await page.goto("/login");
  await page.locator("#apiKey").fill(key);
  await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.getByRole("button", { name: "Tablero", exact: true })).toBeEnabled();
}
async function board(page: Page) {
  await page.getByRole("button", { name: "Tablero", exact: true }).click();
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("1");
  await expect(page.getByRole("article")).toHaveCount(25);
  await expect(page.getByRole("button", { name: "Actualizar tablero" })).toBeEnabled();
}
const column = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
async function chooseMove(page: Page, id = 10001) {
  await page.getByRole("button", { name: `Mover incidencia #${id}`, exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Estado de destino" })).toBeEnabled();
  await page.getByRole("combobox", { name: "Estado de destino" }).selectOption("2");
}
test.beforeEach(async ({ request }) => {
  await control(request, { reset: true, boardMode: true });
});

test("board pages each real status and remembers the view and project", async ({
  page,
  request,
}) => {
  await login(page);
  await board(page);
  await expect(column(page, "New")).toContainText("25 de 28");
  await expect(column(page, "Closed")).toContainText("0 de 0");
  await column(page, "New").getByRole("button", { name: "Cargar más" }).click();
  await expect(column(page, "New").getByRole("article")).toHaveCount(28);
  await page.reload();
  await expect(page.getByRole("button", { name: "Tablero", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("combobox", { name: "Proyecto", exact: true })).toHaveValue("1");
  const state = await stats(request);
  expect(state.listRequests.some((url: string) => url.includes("offset=25"))).toBe(true);
  expect(
    state.readRequests.some((entry: { path: string }) => entry.path === "/custom_fields.json"),
  ).toBe(false);
});

test("keyboard status action saves one change and refreshes columns", async ({ page, request }) => {
  await login(page);
  await board(page);
  await page.getByRole("button", { name: "Mover incidencia #10001", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox", { name: "Estado de destino" })).toBeEnabled();
  await page.getByRole("combobox", { name: "Estado de destino" }).selectOption("2");
  await page.getByRole("button", { name: "Cambiar estado", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Estado actualizado." })).toBeVisible();
  await expect(
    column(page, "In progress").getByRole("link", { name: "BOARD-1-1", exact: true }),
  ).toBeVisible();
  expect((await stats(request)).moves).toHaveLength(1);
});

test("dragging uses allowed transitions and confirms the resulting status", async ({
  page,
  request,
}) => {
  await login(page);
  await board(page);
  const card = page.getByRole("article", { name: "#10001 BOARD-1-1", exact: true });
  const source = (await card.boundingBox())!;
  const statusResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/issues/10001",
  );
  await page.mouse.move(source.x + 20, source.y + 20);
  await page.mouse.down();
  await page.mouse.move(source.x + 45, source.y + 30, { steps: 8 });
  await statusResponse;
  const target = (await column(page, "In progress").boundingBox())!;
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(
    column(page, "In progress").getByRole("link", { name: "BOARD-1-1", exact: true }),
  ).toBeVisible();
  expect((await stats(request)).moves).toHaveLength(1);
});

test("lost response requires verification and never replays the write", async ({
  page,
  request,
}) => {
  await control(request, { statusMode: "unknown" });
  await login(page);
  await board(page);
  await chooseMove(page);
  await page.getByRole("button", { name: "Cambiar estado", exact: true }).click();
  await expect(page.getByRole("button", { name: "Comprobar estado" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Proyecto", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page.getByRole("button", { name: "Tablero", exact: true }).click();
  await expect(page.getByRole("button", { name: "Comprobar estado" })).toBeVisible();
  await page.getByRole("button", { name: "Comprobar estado" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Estado comprobado: In progress." }),
  ).toBeVisible();
  expect((await stats(request)).moves).toHaveLength(1);
});

for (const mode of ["forbidden", "validation", "conflict"])
  test(`Redmine ${mode} keeps the card in its confirmed column`, async ({ page, request }) => {
    await control(request, { statusMode: mode });
    await login(page);
    await board(page);
    await chooseMove(page);
    await page.getByRole("button", { name: "Cambiar estado", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Mover incidencia #10001", exact: true }).getByRole("alert"),
    ).toBeVisible();
    await expect(
      column(page, "New").getByRole("link", { name: "BOARD-1-1", exact: true }),
    ).toBeVisible();
    expect((await stats(request)).moves).toHaveLength(1);
  });

test("missing transitions stay read-only and the status API validates access and origin", async ({
  page,
  request,
}) => {
  expect((await page.request.get("/api/issues/10001")).status()).toBe(401);
  await control(request, { omitAllowedStatuses: true });
  await login(page);
  await board(page);
  await page.getByRole("button", { name: "Mover incidencia #10001", exact: true }).click();
  await expect(page.getByText("No hay transiciones disponibles.", { exact: false })).toBeVisible();
  expect(
    (
      await page.request.patch("/api/issues/10001/status", {
        data: { statusId: 2, expectedStatusId: 1 },
      })
    ).status(),
  ).toBe(403);
  const headers = { origin: "http://localhost:3220" };
  expect(
    (
      await page.request.patch("/api/issues/10001/status", {
        headers,
        data: { statusId: 0, expectedStatusId: 1 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.patch("/api/issues/10001/status", {
        headers,
        data: { statusId: 2, expectedStatusId: 1 },
      })
    ).status(),
  ).toBe(403);
  expect((await stats(request)).moves).toHaveLength(0);
});

test("pending and late board responses cannot cross an account change", async ({
  page,
  request,
}) => {
  await login(page);
  await board(page);
  await chooseMove(page);
  await control(request, { statusMode: "hold" });
  await page.getByRole("button", { name: "Cambiar estado", exact: true }).click();
  await expect.poll(async () => (await stats(request)).moves.length).toBe(1);
  await expect(page.getByRole("button", { name: "Cambiar estado", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cerrar sesión de Redmine" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "synthetic-B");
  await board(page);
  await control(request, { release: "move", statusMode: "success" });
  await expect(page.getByRole("article").first()).toContainText("BOARD-2-");
  await expect(page.getByText("BOARD-1-1", { exact: true })).not.toBeVisible();
});

test("creation drawer traps focus and hides a pending submission without cancelling it", async ({
  page,
  request,
}) => {
  await login(page);
  await control(request, { createMode: "hold" });
  const trigger = page.getByRole("button", { name: "Crear incidencia", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Crear incidencia" });
  await expect(dialog).toBeVisible();
  await page.locator("#issue-project").selectOption("1");
  await page.locator("#issue-tracker").selectOption("10");
  await page.locator("#issue-subject").fill("Drawer pending");
  await dialog.getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await expect.poll(async () => (await stats(request)).creates.length).toBe(1);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeDisabled();
  await control(request, { release: "create" });
  await expect(page.getByText("Incidencia #1001: Drawer pending", { exact: false })).toBeVisible();
  expect((await stats(request)).creates).toHaveLength(1);
});

test("built-in themes persist and fit mobile, tablet and desktop", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByLabel("Tema", { exact: true }).selectOption("light");
  await login(page);
  await board(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.getByRole("button", { name: "Preferencias de cuenta" }).click();
      await page.getByLabel("Tema", { exact: true }).selectOption(theme);
      await page.getByRole("button", { name: "Cerrar panel" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: test.info().outputPath(`board-${width}-${theme}.png`),
        fullPage: true,
      });
    }
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("mobile record cards retain every field and the current page when resized", async ({
  page,
  request,
}) => {
  const longText = "ProyectoSinEspacios".repeat(12);
  await page.route("**/api/issues?**", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    const pageNumber = Number(new URL(route.request().url()).searchParams.get("page") ?? 1);
    data.totalCount = 28;
    data.offset = (pageNumber - 1) * data.limit;
    data.issues = Array.from({ length: Math.min(data.limit, 28 - data.offset) }, (_, index) => ({
      ...data.issues[0],
      id: data.offset + index + 1,
      subject: longText,
      project: longText,
      assignedTo: longText,
    }));
    await route.fulfill({ response, json: data });
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await login(page);
  await expect(page.getByRole("button", { name: "Lista", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const table = page.getByRole("table");
  const row = table.getByRole("row").last();
  await expect(row).toHaveCSS("display", "grid");
  await expect(row.getByRole("cell")).toHaveCount(6);
  await expect(row.getByRole("columnheader")).toHaveCount(0);
  await expect(row.getByRole("link")).toHaveText(longText);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Página siguiente", exact: true }).click();
  await expect(page.getByText("Página 2 · 28 incidencias", { exact: true })).toBeVisible();
  const before = (await stats(request)).listRequests.length;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(row).toHaveCSS("display", "table-row");
  await expect(page.getByText("Página 2 · 28 incidencias", { exact: true })).toBeVisible();
  expect((await stats(request)).listRequests).toHaveLength(before);
});

test.describe("touch interaction", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("a touch user can move a card without dragging and navigate from the mobile menu", async ({
    page,
    request,
  }) => {
    await login(page);
    await board(page);
    await page.getByRole("button", { name: "Mover incidencia #10001", exact: true }).tap();
    await expect(page.getByRole("combobox", { name: "Estado de destino" })).toBeEnabled();
    await page.getByRole("combobox", { name: "Estado de destino" }).selectOption("2");
    await page.getByRole("button", { name: "Cambiar estado", exact: true }).tap();
    await expect(
      column(page, "In progress").getByRole("link", { name: "BOARD-1-1", exact: true }),
    ).toBeVisible();
    expect((await stats(request)).moves).toHaveLength(1);
    await page.getByRole("button", { name: "Abrir navegación" }).tap();
    const navigation = page.getByRole("navigation", { name: "Navegación", exact: true });
    await expect(navigation).toBeVisible();
    await navigation.getByRole("link", { name: "Diagnóstico", exact: true }).tap();
    await expect(page).toHaveURL(/\/diagnostics$/);
    await expect(navigation).not.toBeVisible();
  });
});

for (const width of [320, 768, 1440]) {
  test(`the main navbar opens with keyboard and keeps its brand centered at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await login(page);
    await expect(page.getByRole("complementary")).toHaveCount(0);
    const header = page.getByRole("banner");
    const brand = await header.getByRole("link", { name: "Redmine Workspace" }).boundingBox();
    expect(Math.abs(brand!.x + brand!.width / 2 - width / 2)).toBeLessThan(2);
    const trigger = header.getByRole("button", { name: "Abrir navegación" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const navigation = page.getByRole("navigation", { name: "Navegación", exact: true });
    await expect(
      navigation.getByRole("link", { name: "Incidencias", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: test.info().outputPath(`navbar-${width}.png`) });
    await page.keyboard.press("Tab");
    await expect(navigation.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(navigation).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await navigation.getByRole("link", { name: "Mi tiempo", exact: true }).click();
    await expect(page).toHaveURL(/\/spent-time$/);
    await expect(navigation).not.toBeVisible();
    await header.getByRole("button", { name: "Preferencias de cuenta" }).click();
    const dialog = page.getByRole("dialog", { name: "Preferencias de cuenta" });
    await dialog.getByLabel("Tema", { exact: true }).selectOption("dark");
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
}

test("the palette button selects every unmodified DaisyUI preset and saves it across routes", async ({
  page,
}) => {
  await login(page);
  const palette = page.getByRole("banner").getByRole("button", { name: "Preferencias de cuenta" });
  await expect(palette.locator("svg.lucide-palette")).toHaveCount(1);
  await palette.click();
  const select = page.getByLabel("Tema", { exact: true });
  await expect(select.locator("option")).toHaveText([...themes]);
  for (const theme of themes) {
    const source = await readFile(`node_modules/daisyui/theme/${theme}/object.js`, "utf8");
    const tokens: Record<string, string> = JSON.parse(
      source.replace(/^export default /, "").replace(/;\s*$/, ""),
    );
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const mismatches = await page.locator("html").evaluate((html, expected) => {
      const style = getComputedStyle(html);
      const ctx = document.createElement("canvas").getContext("2d")!;
      const pixel = (color: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return ctx.getImageData(0, 0, 1, 1).data;
      };
      return Object.entries(expected).filter(([key, value]) => {
        const actual = style.getPropertyValue(key).trim();
        if (key.startsWith("--color-")) {
          // Tailwind compiles OKLCH to Lab; compare rendered colors within rounding precision.
          const reference = pixel(value);
          return pixel(actual).some((channel, index) => Math.abs(channel - reference[index]) > 1);
        }
        const normalize = (token: string) => token.replace(/(^|\s)0\./g, "$1.");
        return normalize(actual) !== normalize(value);
      });
    }, tokens);
    expect(mismatches, `Native tokens for ${theme}`).toEqual([]);
  }
  await select.selectOption("cupcake");
  await page.getByRole("button", { name: "Cerrar panel" }).click();
  await page.goto("/spent-time");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "cupcake");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "cupcake");
  await page.getByRole("button", { name: "Cerrar sesión de Redmine" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Tema", { exact: true })).toHaveValue("cupcake");
});
