---
description: "Implementation tasks for the My Spent Time report"
---

# Tasks: My Spent Time

**Input**: Design documents from `/specs/005-my-spent-time/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), and [contracts/spent-time-report.md](contracts/spent-time-report.md).

**Tests**: No separate test tasks are included because the feature request did not explicitly request a test-first workflow. Follow [quickstart.md](quickstart.md) for validation after implementation.

**Organization**: Tasks are grouped by user story so each increment can be implemented and reviewed independently.

## Phase 1: Setup

**Purpose**: No project setup is needed; the existing Next.js, TypeScript, Zod, SWR, and UI dependencies already provide the planned stack.

## Phase 2: Foundational

**Purpose**: Add the validated, authenticated Redmine data retrieval used by all report stories.

- [x] T001 [P] Define the Redmine time-entry response schema and inferred types in `src/modules/redmine/schemas/time-entry-response.ts`, including required positive `id`, date-only `spentOn`, finite positive decimal `hours`, required positive `project.id` and non-empty `project.name`, required positive `activity.id` and non-empty `activity.name`, optional issue, and optional comments.
- [x] T002 Add a paginated time-entry reader to `src/modules/redmine/helpers/redmine-api.ts` that requests only the session-derived user ID and requested inclusive date bounds, follows `total_count`/`limit`/`offset` until complete, validates each page with T001, and fails the full read if any page fails or is malformed.

**Checkpoint**: The shared Redmine boundary returns only a validated complete personal result or an error; feature stories can build on it.

## Phase 3: User Story 1 - Review personal time overview (Priority: P1) 🎯 MVP

**Goal**: Show the signed-in user's current-month total, time trend, and project/activity distribution on a dedicated page.

**Independent Test**: Sign in as a normal user with known entries in the current month; confirm total hours and both chart datasets match the complete date-bounded personal entries. Confirm the empty, loading, expired-session, and failed-request states are distinct.

### Implementation for User Story 1

- [x] T003 [US1] Define date-range query and report response schemas in `src/modules/spent-time/schemas/spent-time-report.ts`, including date filters, summary values, chart buckets, project/activity choices, and the base report response; implement the current-month date range in `src/modules/spent-time/helpers/spent-time-query.ts` using the configured application time zone.
- [x] T004 [US1] Implement complete-set aggregation in `src/modules/spent-time/helpers/spent-time-summary.ts` using the T003 report types: sum decimal hours, build both project and activity distributions, use daily buckets for ranges ≤31 days, Monday-start weekly buckets for 32–366 days, and monthly buckets for ranges >366 days.
- [x] T005 [US1] Implement the authenticated date-bounded report handler in `src/modules/spent-time/handlers/spent-time-route.ts`; derive user ID/API key from the session, validate query and upstream data, return summaries plus distinct project/activity choices, use the existing safe error envelope, and never return partial summaries.
- [x] T006 [US1] Expose the handler as `GET /api/spent-time` with `Cache-Control: no-store` in `src/app/api/spent-time/route.ts`.
- [x] T007 [P] [US1] Add the report SWR hook in `src/modules/spent-time/hooks/use-spent-time-report.ts`, keying by the date range and exposing loading, error, retry, and response state through the per-session cache.
- [x] T008 [P] [US1] Implement memoized TanStack Charts SVG trend and switchable project/activity distribution with accessible names, keyboard focus, tooltips, and equivalent localized text summaries in `src/modules/spent-time/components/spent-time-chart.tsx`.
- [x] T009 [US1] Build the summary dashboard and report loading, empty, and failure presentation in `src/modules/spent-time/components/spent-time-dashboard.tsx`, consuming the report hook and charts without importing SWR directly.
- [x] T010 [US1] Add the authenticated report page in `src/app/spent-time/page.tsx`, using the existing session authentication and per-session SWR cache provider.
- [x] T011 [P] [US1] Add localized report titles, total labels, chart labels/text summaries, loading, empty, retry, and error messages for every supported locale in `src/shared/i18n/translations.ts`.
- [x] T012 [US1] Add a discoverable `/spent-time` link beside the existing Diagnostics link in the authenticated footer in `src/modules/issues/components/issue-list.tsx` and localize its label in `src/shared/i18n/translations.ts`.

**Checkpoint**: The P1 overview works for the default month without filters or detail pagination.

## Phase 4: User Story 2 - Filter and compare time entries (Priority: P2)

**Goal**: Let the user choose a date range, project, and activity; keep total and charts aligned with the same server-filtered result.

**Independent Test**: Select date bounds, project, and activity separately and together; confirm the visible active criteria and that each total/chart reflects exactly the corresponding entries. Clear filters and verify the unfiltered date-bounded result returns.

### Implementation for User Story 2

- [x] T013 [US2] Extend report query validation and the shared report types with optional positive `projectId` and `activityId` fields in `src/modules/spent-time/schemas/spent-time-report.ts`; reject IDs that are not present in the complete date-bounded choice set.
- [x] T014 [US2] Apply project and activity filters on the complete personal result before aggregation in `src/modules/spent-time/handlers/spent-time-route.ts`, preserving complete-set project/activity choices for the selectors.
- [x] T015 [US2] Include date, project, and activity criteria in the SWR key and request URL in `src/modules/spent-time/hooks/use-spent-time-report.ts`; when either date bound changes, clear `projectId` and `activityId`, while project/activity changes preserve the other filter.
- [x] T016 [P] [US2] Add accessible date, project, and activity controls in `src/modules/spent-time/components/spent-time-dashboard.tsx`; use the server-provided choices, show active dates, disable query-changing controls during revalidation, and keep logout available.
- [x] T017 [P] [US2] Add localized date/filter labels, validation messages, and no-match copy for every supported locale in `src/shared/i18n/translations.ts`.

**Checkpoint**: Each report summary reflects the same date, project, and activity criteria.

## Phase 5: User Story 3 - Inspect individual time entries (Priority: P3)

**Goal**: Show all matching entry details in server-paginated pages with clear handling for optional issue and comment values.

**Independent Test**: Use a result larger than one detail page; verify each row's date, decimal hours, project, activity, and available issue/comments; navigate through every page with no duplicate or missing entry IDs, while summaries continue to cover the complete filtered set.

### Implementation for User Story 3

- [x] T018 [US3] Extend report query/response schemas with one-based `page` and `pageSize` from 1 through 100 (defaults 1 and 25), paginated `entries`, and effective pagination metadata in `src/modules/spent-time/schemas/spent-time-report.ts`.
- [x] T019 [US3] After complete-set filtering and aggregation, slice the matching details for the requested page in `src/modules/spent-time/handlers/spent-time-route.ts`; keep `totalCount` and summaries based on the full filtered set and reject invalid pagination values.
- [x] T020 [US3] Include page/pageSize in the SWR key and report request URL in `src/modules/spent-time/hooks/use-spent-time-report.ts`; reset to page 1 when any date, project, or activity filter changes.
- [x] T021 [P] [US3] Implement the semantic time-entry table in `src/modules/spent-time/components/time-entry-table.tsx`, showing date, decimal hours, project, activity, issue when present, and a clear empty-value label for missing issue/comments.
- [x] T022 [US3] Integrate the detail table and previous/next pagination controls into `src/modules/spent-time/components/spent-time-dashboard.tsx`, with accessible names, disabled states during revalidation, and localized page counts.
- [x] T023 [P] [US3] Add localized table headings, missing-value labels, and pagination labels for every supported locale in `src/shared/i18n/translations.ts`.

**Checkpoint**: The user can inspect every matching row while totals and charts remain based on the complete filtered result.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close accessibility, security, locale, and acceptance gaps across the completed stories.

- [x] T024 [P] Confirm chart text summaries, keyboard operation, visible focus, semantic table markup, and non-color-only interpretation across `src/modules/spent-time/components/spent-time-chart.tsx` and `src/modules/spent-time/components/time-entry-table.tsx`.
- [x] T025 Confirm route errors and responses preserve the authenticated user scope, sanitized error envelope, and `Cache-Control: no-store` in `src/modules/spent-time/handlers/spent-time-route.ts` and `src/app/api/spent-time/route.ts`.
- [x] T026 Verify the default-month boundary from `src/modules/spent-time/helpers/spent-time-query.ts` matches the configured Redmine time zone in the target deployment; resolve any missing app time-zone configuration before acceptance.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No work required; the current project stack is already configured.
- **Foundational (Phase 2)**: T001 precedes T002; both must finish before report stories.
- **User Story 1 (Phase 3)**: Depends on the foundational Redmine schema/reader; delivers the MVP overview.
- **User Story 2 (Phase 4)**: Depends on US1's report route, SWR query, and dashboard.
- **User Story 3 (Phase 5)**: Depends on US1's report route and US2's shared filter/query behavior.
- **Polish (Phase 6)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2; T003 establishes the configured-time-zone current-month range before the first report request and US1 independently delivers totals and charts.
- **US2 (P2)**: Extends the US1 report query and dashboard with date/project/activity controls.
- **US3 (P3)**: Extends the same report response with paginated detail rows; depends on the US2 filtered result contract so the table and summaries stay aligned.

### Parallel Opportunities

- T003 must finish before T004 because the aggregation uses its report types. T007, T008, and T011 can proceed in parallel once the response contract is agreed.
- In US2, T016 and T017 can proceed in parallel after the query/filter types are settled.
- In US3, T021 and T023 can proceed in parallel after the detail row shape is fixed.
- Story implementation is sequential because US2 and US3 extend the same route, hook, and dashboard files.

## Implementation Strategy

### MVP First

Complete Phase 2 and US1 to deliver an authenticated current-month overview with total hours and accessible charts. Then complete US2 and US3 to add filters and paginated details.

### Incremental Delivery

1. Establish validated, complete Redmine retrieval for the signed-in user.
2. Deliver total and charts for the default month.
3. Add date, project, and activity filters.
4. Add server-paginated details and validate the end-to-end acceptance scenarios.

## Notes

- Every task uses the required checkbox, sequential ID, optional parallel marker, story label where applicable, and a concrete file path.
- [P] marks tasks in separate files that can proceed without waiting for another incomplete task.
- No new dependency or separate test task is introduced; use the repository's existing validation tools as described in `quickstart.md`.
