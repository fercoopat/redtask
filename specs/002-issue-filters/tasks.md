---
description: "Actionable task list for issue filtering, personal filters, and pagination"
---

# Tasks: Issue Filters

**Input**: Design documents from `/specs/002-issue-filters/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/issues-list.md](contracts/issues-list.md), [quickstart.md](quickstart.md)

**Tests**: No test tasks included; the feature specification does not request tests or a TDD approach. Each story includes independent acceptance criteria for implementation review.

**Organization**: Tasks are grouped by user story. Pagination can be delivered against the existing unfiltered issue list; filter personalization builds on the filtering story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

No setup tasks are needed. The authenticated issue list, same-origin endpoint, Redmine API helper, and installed dependencies already exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared request validation required before implementing filters or pagination

- [x] T001 Add Zod parsing for issue-list page, page-size, and filter query parameters in `src/modules/issues/helpers/issue-list-query.ts`; default page to 1 and page size to 10, allow only page sizes 10, 25, 50, and 100, and reject malformed criteria without silently dropping them.
- [x] T002 Validate `/api/issues` query parameters with the shared parser and return a safe 400 response for invalid input in `src/modules/issues/handlers/issues-route.ts`.

**Checkpoint**: The issues endpoint has a validated request boundary; user stories can proceed independently.

---

## Phase 3: User Story 1 - Filter the issue list (Priority: P1) 🎯 MVP

**Goal**: Let users combine supported Redmine issue filters and find only issues matching all active criteria.

**Independent Test**: Apply multiple supported criteria, confirm every displayed issue matches them and the result count reflects the filtered result set, then remove a criterion and clear all filters.

### Implementation for User Story 1

- [x] T003 [P] [US1] Define the standard issue filter fields and operators implemented by the application, plus their field types and Redmine-provided values, in `src/modules/issues/helpers/issue-filter-options.ts`; include custom fields only when they are filterable and their metadata is available to the signed-in account, and allow typed values when no selectable values are provided.
- [x] T004 [P] [US1] Extend the Redmine issue-list request builder to encode validated filter criteria and request the matching result total in `src/modules/redmine/helpers/redmine-api.ts`; preserve Redmine filter rejections as recoverable errors and never retry without the rejected criteria. Do not implement page/limit conversion in this task.
- [x] T005 [US1] Validate each criterion's field and operator against the application's catalog and its value against the field type/cardinality in the authenticated issues handler; return 400 for invalid criteria before calling Redmine, then pass valid criteria to the issue-list helper in `src/modules/issues/handlers/issues-route.ts` (depends on T001-T004).
- [x] T006 [US1] Add controls to select field/operator/value, combine criteria with AND semantics, edit/remove criteria, clear all filters, and show active criteria and empty results in `src/modules/issues/components/issue-list.tsx`; reset to page 1 when criteria change (depends on T003, T005).
- [x] T007 [US1] Keep active issue-list criteria in the SWR request key and preserve them during retry and recoverable Redmine errors in `src/modules/issues/components/issue-list.tsx` (depends on T006).

**Checkpoint**: Filtering works independently with supported Redmine fields, applies all criteria server-side, and can be cleared without losing understandable error and empty states.

---

## Phase 4: User Story 3 - Paginate issue results (Priority: P2)

**Goal**: Let users navigate the complete issue result set and choose their preferred page size, defaulting to 10. This story works with the existing unfiltered issue list and does not require US1.

**Independent Test**: Load more issues than fit on one page, navigate between pages, change page size, reload, and confirm page metadata, preference, and issue ordering remain consistent.

### Implementation for User Story 3

- [x] T008 [P] [US3] Add a versioned browser-preference helper for page size in `src/modules/issues/helpers/issue-list-preferences.ts`; persist only supported values 10, 25, 50, or 100 under a key scoped by Redmine base URL and user identity, and resolve missing, invalid, or unreadable preferences to 10.
- [x] T009 [P] [US3] Convert the validated one-based page and page size to Redmine `offset` and `limit`, pass them through the issues handler, and return Redmine `total_count`, `offset`, and `limit` in `src/modules/redmine/helpers/redmine-api.ts` and `src/modules/issues/handlers/issues-route.ts` (depends on T001, T002).
- [x] T010 [US3] Add first, previous, next, and last page controls when those pages exist and show the current page and total count when available in `src/modules/issues/components/issue-list.tsx` (depends on T009).
- [x] T011 [US3] Add the page-size selector with choices 10, 25, 50, and 100, use 10 by default, persist the choice through the preference helper, and reset to page 1 when page size changes in `src/modules/issues/components/issue-list.tsx` (depends on T008, T010).
- [x] T012 [US3] Correct an out-of-range page to the last valid page without duplicate or omitted issues; when the result count is zero, keep the list on page 1 and hide page-navigation controls in `src/modules/issues/components/issue-list.tsx` (depends on T010, T011).

**Checkpoint**: Unfiltered issue results can be paged without fetching the full issue set into the browser; an unset page-size preference shows 10 issues per page.

---

## Phase 5: User Story 2 - Personalize and reuse filters (Priority: P2)

**Goal**: Let each user choose visible filter controls and save named personal filter sets for reuse.

**Independent Test**: Customize visible controls, save a named multi-criterion filter, reload the list, apply it, then rename, update, and delete it. Confirm another Redmine user's preferences are not loaded.

### Implementation for User Story 2

- [x] T013 [P] [US2] Extend browser preferences in `src/modules/issues/helpers/issue-list-preferences.ts` to store selected visible filter controls and saved filters alongside page size; scope them by Redmine base URL and user identity, and store no API key or session credential (depends on T008).
- [x] T014 [US2] Render a preference control for choosing default visible filter fields while keeping every other currently available field addable in `src/modules/issues/components/issue-list.tsx` (depends on T003, T013).
- [x] T015 [US2] Add personal saved-filter actions to save with a required, trimmed, non-empty name; apply, rename, update, and delete criteria in `src/modules/issues/components/issue-list.tsx` (depends on T007, T013).
- [x] T016 [US2] Identify saved criteria that are no longer supported and let the user edit or remove them before applying, without silently broadening results, in `src/modules/issues/components/issue-list.tsx` (depends on T003, T015).

**Checkpoint**: Filter controls and named saved filters persist for the current Redmine user and remain isolated from other users in the same browser profile.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the integrated flow and project constraints

- [x] T017 [P] Ensure filter, saved-filter, and pagination controls have accessible labels, keyboard operation, visible focus, and appropriate loading/empty/error states in `src/modules/issues/components/issue-list.tsx`.
- [x] T018 Review issue-list query validation and Redmine request construction for permission preservation, safe URL encoding, and absence of credentials in preference storage in `src/modules/issues/helpers/issue-list-query.ts`, `src/modules/issues/helpers/issue-list-preferences.ts`, and `src/modules/redmine/helpers/redmine-api.ts`.
- [x] T019 Walk through the filter, personalization, pagination, permission, and failure scenarios in `specs/002-issue-filters/quickstart.md` and record any implementation gaps in `specs/002-issue-filters/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No changes required; repository structure and dependencies already exist.
- **Foundational (Phase 2)**: Complete T001 and T002 before issue-list feature work.
- **User Stories**: US1 is the filtering MVP. US3 pagination can start after Phase 2 and works with the unfiltered list. US2 depends on US1's filter model and controls.
- **Polish (Phase 6)**: Complete after the desired user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; no dependency on another story.
- **User Story 3 (P2)**: Starts after Phase 2; pagination is usable on the current unfiltered issue list. It combines with filters when US1 is also delivered.
- **User Story 2 (P2)**: Starts after US1 and T008; uses the filter criteria and page-size preference models.

### Within Each User Story

- Independent metadata, request mapping, and preference-helper work may be parallelized where marked `[P]`.
- Endpoint wiring follows request parsing and the relevant Redmine request implementation.
- UI work follows the relevant server and metadata contracts.
- No test-first tasks are included because tests were not requested.

### Parallel Opportunities

- **US1**: T003 (filter metadata) and T004 (filter request mapping) can proceed in parallel after the foundational request shape is agreed.
- **US3**: T008 (page-size preference) and T009 (server-side paging) touch different files and can proceed in parallel after Phase 2.
- **US2**: T013 (preference helper extension) precedes UI integration tasks T014-T016.
- User stories are independently deliverable after their stated dependencies; tasks editing the same `issue-list.tsx` file should be serialized.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 request validation.
2. Complete Phase 3 filter metadata, Redmine filter mapping, endpoint wiring, and filter UI.
3. Independently validate multiple criteria, editing/removal, empty results, and error retry behavior.
4. Add pagination and personal preferences as later increments.

### Incremental Delivery

1. Implement the shared request boundary.
2. Deliver US1 filtering as the MVP.
3. Deliver US3 pagination on the existing unfiltered list.
4. Deliver US2 filter-control customization and personal saved filters.
5. Complete cross-cutting accessibility, permission, and quickstart review.

## Notes

- `[P]` marks work in different files that has no dependency on an incomplete task.
- `[US1]`, `[US2]`, and `[US3]` map directly to the user stories in `spec.md`.
- Page-size preference must use the data-model constraint: supported values are 10, 25, 50, and 100; a missing or invalid preference resolves to 10.
- Saved-filter names must use the data-model constraint: required, trimmed, and non-empty.
- All tasks follow the required checkbox, sequential ID, optional parallel marker, story marker, and exact file-path format.
