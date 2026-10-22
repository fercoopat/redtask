import { expect, type Page, test } from "@playwright/test";

async function theme(page: Page, value: string) {
  if (!page.url().endsWith("/login"))
    await page.getByRole("button", { name: "Preferencias de cuenta" }).click();
  await page.getByLabel("Tema", { exact: true }).selectOption(value);
  if (!page.url().endsWith("/login"))
    await page.getByRole("button", { name: "Cerrar panel" }).click();
}

for (const width of [320, 390, 768, 1440])
  test(`all workspace screens fit both design themes at ${width}px`, async ({ page, request }) => {
    test.setTimeout(90_000);
    await request.post("http://127.0.0.1:3219/__control", {
      data: {
        reset: true,
        boardMode: true,
        boardCount: 8,
        issueStates: { "10002": 2, "10003": 2, "10004": 3, "10005": 3 },
      },
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/spent-time?**", async (route) => {
      const from = new URL(route.request().url()).searchParams.get("from")!;
      const to = new URL(route.request().url()).searchParams.get("to")!;
      await route.fulfill({
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
    const capture = async (name: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      // Render the full page before measuring styles below the viewport after a theme change.
      await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: true });
      const contrastFailures = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        const luminance = (rgb: Uint8ClampedArray) =>
          Array.from(rgb)
            .slice(0, 3)
            .map((value) => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        // Preserve the native presets: detect contrast regressions without changing DaisyUI colors.
        const themeStyle = getComputedStyle(document.documentElement);
        const themeLuminance = (token: string) => {
          ctx.fillStyle = themeStyle.getPropertyValue(token).trim();
          ctx.fillRect(0, 0, 1, 1);
          return luminance(ctx.getImageData(0, 0, 1, 1).data);
        };
        const primary = themeLuminance("--color-primary");
        const primaryContent = themeLuminance("--color-primary-content");
        const nativePrimaryContrast =
          (Math.max(primary, primaryContent) + 0.05) / (Math.min(primary, primaryContent) + 0.05);
        const failures: string[] = [];
        const selectors =
          ".label, .text-muted, .workspace-navbar .menu a[aria-current], .view-switch [aria-pressed=true], .btn-primary:not(:disabled), .text-success, .text-warning, .text-error, a.link";
        for (const element of document.querySelectorAll<HTMLElement>(selectors)) {
          if (!element.getClientRects().length || getComputedStyle(element).visibility === "hidden")
            continue;
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, 1, 1);
          const ancestors: Element[] = [];
          for (let parent: Element | null = element; parent; parent = parent.parentElement)
            ancestors.push(parent);
          for (const ancestor of ancestors.reverse()) {
            ctx.fillStyle = getComputedStyle(ancestor).backgroundColor;
            ctx.fillRect(0, 0, 1, 1);
          }
          const background = luminance(ctx.getImageData(0, 0, 1, 1).data);
          ctx.fillStyle = getComputedStyle(element).color;
          ctx.fillRect(0, 0, 1, 1);
          const foreground = luminance(ctx.getImageData(0, 0, 1, 1).data);
          const ratio =
            (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
          const minimum = element.matches(".btn-primary, .view-switch [aria-pressed=true]")
            ? Math.min(4.5, nativePrimaryContrast)
            : 4.5;
          if (ratio + 0.01 < minimum) failures.push(`${element.className}: ${ratio.toFixed(2)}:1`);
        }
        return failures;
      });
      expect(contrastFailures, `Text contrast in ${name}`).toEqual([]);
    };
    await page.goto("/login");
    await page.setViewportSize({ width, height: 1000 });
    for (const value of ["light", "dark"]) {
      await theme(page, value);
      await capture(`login-${width}-${value}`);
    }
    await page.locator("#apiKey").fill("synthetic-A");
    await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
    await expect(page).toHaveURL(/\/issues$/);
    for (const value of ["light", "dark"]) {
      const suffix = `${width}-${value}`;
      await page.goto("/issues");
      await theme(page, value);
      await expect(page.getByRole("button", { name: "Lista", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Lista", exact: true }).click();
      const issueTable = page.getByRole("table");
      await expect(issueTable).toBeVisible();
      await expect(issueTable.getByRole("row").last()).toHaveCSS(
        "display",
        width < 768 ? "grid" : "table-row",
      );
      await capture(`list-${suffix}`);
      await page.getByText("Filtros", { exact: true }).click();
      await capture(`filters-${suffix}`);
      const trigger = page.getByRole("button", { name: "Crear incidencia", exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Crear incidencia" });
      await page.locator("#issue-project").selectOption("1");
      await expect(page.locator("#issue-custom-field-9")).toBeVisible();
      await page.locator("#issue-subject").fill("Revisar permisos del proyecto");
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
      await capture(`create-${suffix}`);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await page.getByRole("button", { name: "Tablero", exact: true }).click();
      await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("1");
      await expect(page.getByRole("button", { name: "Actualizar tablero" })).toBeEnabled();
      await expect(page.getByRole("article")).toHaveCount(8);
      await capture(`board-${suffix}`);
      await page.goto("/spent-time");
      await expect(page.getByRole("img", { name: "Tendencia de horas" })).toBeVisible();
      await expect(page.getByRole("table").getByRole("row").last()).toHaveCSS(
        "display",
        width < 768 ? "grid" : "table-row",
      );
      await capture(`time-${suffix}`);
      await page.goto("/diagnostics");
      await page.locator("#diagnostic-project").selectOption("1");
      await page.getByRole("button", { name: "Ejecutar diagnóstico", exact: true }).click();
      await expect(page.getByRole("region", { name: "Resultados del diagnóstico" })).toBeVisible();
      await capture(`diagnostics-${suffix}`);
    }
  });
