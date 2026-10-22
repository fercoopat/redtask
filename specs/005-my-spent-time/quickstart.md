# Quickstart: My Spent Time

This guide defines validation scenarios for implementation. It uses the existing isolated test tools; it does not require administrator access to a deployed Redmine instance.

## Prerequisites

- Install project dependencies with the repository's documented package manager.
- Use the existing synthetic Redmine fixture and local app session. Do not point automated tests at the company-hosted Redmine instance.
- For real Redmine behavior, use only the isolated Docker setup in [the local Redmine testing guide](../../docs/redmine-local-testing.md) and a normal user account.

## Automated validation

Run the smallest relevant checks after implementation:

```sh
pnpm test:unit
pnpm test:e2e
pnpm lint
pnpm exec tsc --noEmit
pnpm format:check
pnpm build
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e` when Chromium is installed system-wide. Follow [docs/testing.md](../../docs/testing.md) for full setup and isolated Redmine checks.

## Acceptance scenarios

1. **Personal scope**: Sign in as a normal fixture user with entries belonging to multiple users. Confirm the report request is scoped to the current session user and no other user's entry appears.
2. **Default date boundaries**: Verify the current-month range changes at the same calendar boundary as the target Redmine instance's configured time zone.
3. **Complete pagination**: Seed more entries than one Redmine response page and more than one detail page. Confirm each response contains only the requested detail page while the total, both distribution aggregates, trend, and total count cover all matching entries. Navigate pages and confirm no duplicate or missing IDs.
4. **Filters**: Apply date bounds, project, and activity separately and together. Confirm every row and summary reflects the same effective filter set. Change the date range while project/activity are selected and confirm both filters clear, pagination returns to page one, and the new range loads without an invalid-filter error. Confirm invalid date bounds fail visibly and project/activity choices come from the complete date-bounded result.
5. **Summary correctness**: Include fractional hours such as `1.5`; confirm decimal-hour totals, chart values, and row values agree. Confirm ranges up to 31 days group daily, ranges from 32 through 366 days group weekly starting Monday, and longer ranges group monthly.
6. **Project-level entries**: Include an entry without an issue and another without comments. Confirm the row remains understandable and all hours are counted.
7. **Empty and failure states**: Verify no matches, malformed upstream payload, a rejected later page, 401, 403, and Redmine unavailability. Empty results show zero; incomplete/error results never show a partial total as current.
8. **Accessibility**: Navigate filters, chart grouping switch, table pagination, and retry with the keyboard. Confirm chart text summaries and labels are understandable without color.
9. **TanStack Charts**: Confirm both React SVG surfaces expose meaningful accessible names and descriptions, support keyboard focus and tooltips, and keep exact localized values available in adjacent semantic text.
10. **Localization**: Change the application locale and confirm page labels, validation/failure states, and chart text alternatives use the selected locale.
11. **Session/cache isolation**: Change from one fixture user to another with a delayed first user's response. Confirm the old response cannot populate the new user's report and the route response is not cached across sessions.

## Optional local Redmine acceptance

Use the isolated Docker project from `docs/redmine-local-testing.md`. Log in with a normal user, verify their own entries across a date range, project and activity, then compare the report against Redmine's time-entry list. Confirm the connected version accepts the documented filters and that project permissions produce errors or restricted results without requiring an administrator key.
