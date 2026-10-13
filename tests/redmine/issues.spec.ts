import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

import { fixture, redmineURL } from "./fixture";

const creatorHeaders = { "X-Redmine-API-Key": fixture.users.creator.apiKey };
const form = (page: Page) => page.getByRole("form", { name: "Crear incidencia", exact: true });
const submitButton = (page: Page) =>
  form(page).getByRole("button", { name: "Crear incidencia", exact: true });
const subjectFor = () => `Local acceptance ${randomUUID()}`;
async function login(page: Page, user: "creator" | "reader" = "creator") {
  await page.goto("/login");
  await page.locator("#apiKey").fill(fixture.users[user].apiKey);
  await page.getByRole("button", { name: "Conectar con Redmine", exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
}
async function openDraft(page: Page, subject: string, project = fixture.projects[0]) {
  await page.getByRole("button", { name: "Crear incidencia", exact: true }).click();
  await page.locator("#issue-project").selectOption(String(project.id));
  await expect(page.locator(`#issue-custom-field-${project.customFieldId}`)).toBeVisible();
  await page.locator("#issue-tracker").selectOption(String(project.trackerId));
  await page.locator("#issue-subject").fill(subject);
}
async function findIssues(
  request: APIRequestContext,
  subject: string,
  project = fixture.projects[0],
) {
  const result = await request.get(`${redmineURL}/issues.json`, {
    headers: creatorHeaders,
    params: { project_id: project.id, status_id: "*", subject: `~${subject}`, limit: 100 },
  });
  expect(result.ok()).toBe(true);
  const body = await result.json();
  return body.issues.filter((issue: { subject: string }) => issue.subject === subject) as {
    id: number;
    subject: string;
  }[];
}
async function confirmCreated(
  page: Page,
  request: APIRequestContext,
  subject: string,
  project = fixture.projects[0],
) {
  await expect(page.locator(".alert-success")).toContainText(subject);
  const issues = await findIssues(request, subject, project);
  expect(issues).toHaveLength(1);
  const result = await request.get(`${redmineURL}/issues/${issues[0].id}.json`, {
    headers: creatorHeaders,
  });
  expect(result.ok()).toBe(true);
  return (await result.json()).issue;
}

test.beforeAll(async ({ request }) => {
  for (const user of Object.values(fixture.users)) {
    const result = await request.get(`${redmineURL}/users/current.json`, {
      headers: { "X-Redmine-API-Key": user.apiKey },
    });
    expect(result.ok()).toBe(true);
    const body = await result.json();
    expect(body.user.login).toBe(user.login);
    expect(body.user.id).toBe(user.id);
  }
  for (const project of fixture.projects) {
    const result = await request.get(`${redmineURL}/projects/${project.id}.json`, {
      headers: creatorHeaders,
    });
    expect(result.ok()).toBe(true);
    expect((await result.json()).project.identifier).toBe(project.identifier);
  }
});

test("regular account receives stock project metadata", async ({ page }) => {
  await login(page);
  const result = await page.request.get(
    `/api/issues/create-options?projectId=${fixture.projects[0].id}`,
  );
  expect(result.ok()).toBe(true);
  const options = await result.json();
  expect(options.customFields).toContainEqual({
    id: fixture.projects[0].customFieldId,
    name: "QA required 1",
  });
});
test("confirmed submission persists exactly one issue in real Redmine", async ({
  page,
  request,
}) => {
  const subject = subjectFor();
  const project = fixture.projects[0];
  let writes = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/issues" && request.method() === "POST") writes++;
  });
  await login(page);
  await openDraft(page, subject);
  await page.locator("#issue-description").fill("Real REST persistence check");
  await page.locator("#issue-category").selectOption(String(project.categoryId));
  await page.locator(`#issue-custom-field-${project.customFieldId}`).fill("First project value");
  await submitButton(page).click();
  const issue = await confirmCreated(page, request, subject);
  expect(writes).toBe(1);
  expect(issue.description).toBe("Real REST persistence check");
  expect(issue.category.id).toBe(project.categoryId);
  expect(issue.custom_fields).toContainEqual(
    expect.objectContaining({ id: project.customFieldId, value: "First project value" }),
  );
});
test("local required errors and real 422 preserve the editable draft", async ({
  page,
  request,
}) => {
  const subject = subjectFor();
  const project = fixture.projects[0];
  await login(page);
  await openDraft(page, "");
  await submitButton(page).click();
  await expect(page.locator("#issue-subject-error")).toHaveText("Este campo es obligatorio.");
  await page.locator("#issue-subject").fill(subject);
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/issues" && response.request().method() === "POST",
  );
  await submitButton(page).click();
  expect((await responsePromise).status()).toBe(422);
  await expect(form(page).getByRole("alert")).toContainText("Redmine rechazó algunos campos");
  await expect(form(page).getByRole("alert")).toContainText(/qa required 1/i);
  await expect(page.locator("#issue-subject")).toHaveValue(subject);
  expect(await findIssues(request, subject)).toHaveLength(0);
  await page.locator(`#issue-custom-field-${project.customFieldId}`).fill("Corrected");
  await submitButton(page).click();
  await confirmCreated(page, request, subject);
});
test("visible project rejects creation from a read-only account", async ({ page, request }) => {
  const subject = subjectFor();
  await login(page, "reader");
  await openDraft(page, subject);
  await page
    .locator(`#issue-custom-field-${fixture.projects[0].customFieldId}`)
    .fill("Permission check");
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/issues" && response.request().method() === "POST",
  );
  await submitButton(page).click();
  expect((await responsePromise).status()).toBe(422);
  await expect(form(page).getByRole("alert")).toContainText("Redmine rechazó algunos campos");
  await expect(page.locator("#issue-subject")).toBeEnabled();
  expect(await findIssues(request, subject)).toHaveLength(0);
});
test("project switch clears fields and stores only the new project's custom value", async ({
  page,
  request,
}) => {
  const subject = subjectFor();
  const [first, second] = fixture.projects;
  await login(page);
  await openDraft(page, subject);
  await page.locator("#issue-description").fill("Retained text");
  await page.locator("#issue-category").selectOption(String(first.categoryId));
  await page.locator(`#issue-custom-field-${first.customFieldId}`).fill("Stale first project");
  await page.locator("#issue-project").selectOption(String(second.id));
  await expect(page.locator(`#issue-custom-field-${second.customFieldId}`)).toBeVisible();
  await expect(page.locator("#issue-tracker")).toHaveValue("");
  await expect(page.locator("#issue-category")).toHaveValue("");
  await expect(page.locator(`#issue-custom-field-${second.customFieldId}`)).toHaveValue("");
  await expect(page.locator("#issue-subject")).toHaveValue(subject);
  await expect(page.locator("#issue-description")).toHaveValue("Retained text");
  await page.locator("#issue-tracker").selectOption(String(second.trackerId));
  await page.locator(`#issue-custom-field-${second.customFieldId}`).fill("Second project value");
  await submitButton(page).click();
  const issue = await confirmCreated(page, request, subject, second);
  expect(issue.project.id).toBe(second.id);
  expect(issue.custom_fields).toContainEqual(
    expect.objectContaining({ id: second.customFieldId, value: "Second project value" }),
  );
  expect(
    issue.custom_fields.some((field: { id: number }) => field.id === first.customFieldId),
  ).toBe(false);
});
test("keyboard-only creation completes within the two-minute acceptance limit", async ({
  page,
  request,
}, testInfo) => {
  const subject = subjectFor();
  const project = fixture.projects[0];
  await login(page);
  async function tabTo(selector: string) {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await page.locator(selector).evaluate((element) => element === document.activeElement))
        return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`Keyboard could not reach ${selector}`);
  }
  await tabTo('button:has-text("Crear incidencia"):visible');
  const started = performance.now();
  await page.keyboard.press("Enter");
  await expect(page.locator("#issue-project option")).toHaveCount(3);
  await tabTo("#issue-project");
  await page.keyboard.press("Space");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator(`#issue-custom-field-${project.customFieldId}`)).toBeVisible();
  await tabTo("#issue-tracker");
  await page.keyboard.press("Space");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await tabTo("#issue-subject");
  await page.keyboard.type(subject);
  await tabTo(`#issue-custom-field-${project.customFieldId}`);
  await page.keyboard.type("Keyboard value");
  await tabTo('form[aria-label="Crear incidencia"] button[type="submit"]');
  await page.keyboard.press("Enter");
  await confirmCreated(page, request, subject);
  const elapsedMs = performance.now() - started;
  expect(elapsedMs).toBeLessThan(120_000);
  const timingPath = testInfo.outputPath("creation-timing.json");
  await writeFile(timingPath, JSON.stringify({ elapsedMs, includesRedmineWait: true }));
  await testInfo.attach("creation-timing.json", {
    path: timingPath,
    contentType: "application/json",
  });
});
test("revoked Redmine API key ends the app session", async ({ page, request }) => {
  await login(page);
  await openDraft(page, subjectFor());
  await page
    .locator(`#issue-custom-field-${fixture.projects[0].customFieldId}`)
    .fill("Revocation check");
  const composeArgs = [
    "compose",
    "-f",
    "compose.redmine-test.yml",
    "exec",
    "-T",
    "--user",
    "redmine",
    "redmine",
    "bundle",
    "exec",
    "rails",
    "runner",
  ];
  const guard =
    "abort unless ENV['REDMINE_LOCAL_TEST'] == '1' && ActiveRecord::Base.connection.adapter_name == 'SQLite'; ";
  try {
    execFileSync(
      "docker",
      [...composeArgs, guard + "User.find_by!(login: 'qa-creator').api_token.destroy!"],
      { stdio: "pipe" },
    );
    await submitButton(page).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("#issue-subject")).not.toBeVisible();
  } finally {
    execFileSync(
      "docker",
      [
        ...composeArgs,
        guard +
          "data = JSON.parse(File.read('sqlite/test-fixture.json'))['users']['creator']; token = Token.find_or_initialize_by(user_id: data['id'], action: 'api'); token.save!; token.update_column(:value, data['apiKey'])",
      ],
      { stdio: "pipe" },
    );
    const restored = await request.get(`${redmineURL}/users/current.json`, {
      headers: creatorHeaders,
    });
    expect(restored.ok()).toBe(true);
  }
});
