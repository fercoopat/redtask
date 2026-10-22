import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { fixture, redmineURL } from "./fixture";

test("normal creator moves a real issue while the reader cannot change its status", async ({
  page,
  request,
}) => {
  const project = fixture.projects[0];
  const subject = `Local acceptance board ${randomUUID()}`;
  await page.goto("/login");
  await page.locator("#apiKey").fill(fixture.users.creator.apiKey);
  await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
  const created = await page.request.post("/api/issues", {
    headers: { origin: "http://localhost:3031" },
    data: {
      projectId: project.id,
      trackerId: project.trackerId,
      subject,
      customFields: [{ id: project.customFieldId, value: "Board acceptance" }],
    },
  });
  expect(created.status()).toBe(201);
  const { issue } = await created.json();
  const beforeResponse = await page.request.get(`/api/issues/${issue.id}`);
  expect(beforeResponse.ok()).toBe(true);
  const before = (await beforeResponse.json()).issue;
  const target = before.allowedStatuses.find(
    (status: { id: number }) => status.id !== before.statusId,
  );
  expect(target).toBeDefined();
  await page.getByRole("button", { name: "Tablero", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Proyecto", exact: true })
    .selectOption(String(project.id));
  await page.getByRole("button", { name: `Mover incidencia #${issue.id}`, exact: true }).click();
  await page.getByRole("combobox", { name: "Estado de destino" }).selectOption(String(target.id));
  await page.getByRole("button", { name: "Cambiar estado", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Estado actualizado." })).toBeVisible();
  const persisted = await request.get(`${redmineURL}/issues/${issue.id}.json`, {
    headers: { "X-Redmine-API-Key": fixture.users.creator.apiKey },
  });
  expect((await persisted.json()).issue.status.id).toBe(target.id);
  await page.getByRole("button", { name: "Cerrar sesión de Redmine" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.locator("#apiKey").fill(fixture.users.reader.apiKey);
  await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
  const denied = await page.request.patch(`/api/issues/${issue.id}/status`, {
    headers: { origin: "http://localhost:3031" },
    data: { expectedStatusId: target.id, statusId: before.statusId },
  });
  expect(denied.status()).toBe(403);
  const unchanged = await request.get(`${redmineURL}/issues/${issue.id}.json`, {
    headers: { "X-Redmine-API-Key": fixture.users.creator.apiKey },
  });
  expect((await unchanged.json()).issue.status.id).toBe(target.id);
});
