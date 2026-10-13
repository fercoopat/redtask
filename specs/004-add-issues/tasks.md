---
description: "Task list for implementing the Add Issues feature"
---

# Tasks: Add Issues

**Input**: Design documents from `specs/004-add-issues/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/issue-creation.md`

**Validation**: The review follow-up adds automated unit and browser regression checks described in `docs/testing.md`. T015 combines isolated standard-error checks with the recorded authorized success flow against the deployed instance; neither documentation nor isolated tests alone establishes deployment compatibility.

**Organization**: Tasks are grouped by user story; US2 builds on the creation flow from US1.

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

No setup tasks are needed. The repository, app routes, dependencies, linting, and formatting are already configured.

---

## Phase 2: Foundational

**Purpose**: Shared validation and authenticated Redmine request support required by both stories.

- [x] T001 [P] Define Zod schemas and types for the issue draft, project choices, project creation options, Redmine validation messages, and created-issue summary in `src/modules/issues/schemas/issue-creation.ts`.
- [x] T002 [P] Extend the authenticated Redmine request helper to support JSON `POST` requests while preserving the API-key header, `no-store`, redirect rejection, and timeout behavior in `src/modules/redmine/helpers/redmine-api.ts`.

**Checkpoint**: Shared request and data boundaries are ready for issue creation work.

---

## Phase 3: User Story 1 - Create an issue (Priority: P1) 🎯 MVP

**Goal**: Let an authenticated user select a project, fill issue fields, submit one issue, and identify the issue after Redmine confirms creation.

**Independent Test**: In a Redmine project where the account can add issues, select a project, submit valid issue details, and confirm exactly one issue is created and identified in the success state.

### Implementation for User Story 1

- [x] T003 [US1] Add Redmine readers for visible projects and selected-project trackers, categories, priorities, and issue custom fields/options where supported; treat version-dependent metadata as optional in `src/modules/redmine/helpers/redmine-api.ts`.
- [x] T004 [US1] Add a validated `createRedmineIssue` operation that submits only supported issue fields and parses the created issue identifier in `src/modules/redmine/helpers/redmine-api.ts`.
- [x] T005 [US1] Implement the authenticated `GET /api/issues/create-options` handler for project listing and `projectId`-scoped metadata in `src/modules/issues/handlers/issue-create-options-route.ts` and wire it through `src/app/api/issues/create-options/route.ts`.
- [x] T006 [US1] Implement the same-origin, JSON-validated authenticated `POST /api/issues` handler in `src/modules/issues/handlers/issues-route.ts` and export it from `src/app/api/issues/route.ts` while preserving the existing `GET` handler.
- [x] T007 [US1] Build an accessible create-issue form with project selection, project-specific available fields, required input validation, pending state, and confirmed-creation summary in `src/modules/issues/components/issue-create-form.tsx`.
- [x] T008 [US1] Add the Add issue entry point to `IssueList`, show the create form, and refresh the list or link to the created issue after success in `src/modules/issues/components/issue-list.tsx`.
- [x] T009 [P] [US1] Add translated create-form labels, required-field feedback, pending text, and success messages for every supported locale in `src/shared/i18n/translations.ts`.

**Checkpoint**: A user with permission can create and identify an issue; Redmine remains the source of truth for permissions and field validation.

---

## Phase 4: User Story 2 - Recover from a rejected submission (Priority: P2)

**Goal**: Explain validation, permission, session, and availability failures without losing entered values or claiming success; make retries safe when the outcome is known.

**Independent Test**: With the US1 form, submit invalid fields and attempt creation without project permission; verify useful errors, preserved values, and no false success. Simulate an unavailable Redmine response and confirm the UI does not claim the outcome is certain.

### Implementation for User Story 2

- [x] T010 [US2] Preserve safe Redmine `422 Unprocessable Entity` validation details as a typed failure instead of collapsing them to an unexpected response in `src/modules/redmine/helpers/redmine-api.ts`.
- [x] T011 [US2] Map validation, forbidden, expired-session, unavailable, and unknown creation outcomes to the contract's safe status codes and response bodies in `src/modules/issues/handlers/issues-route.ts`.
- [x] T012 [US2] Render returned field errors and retain the draft; never auto-resubmit an ambiguous request, and require the user to verify in Redmine before explicitly retrying in `src/modules/issues/components/issue-create-form.tsx`.
- [x] T013 [US2] Add localized permission, validation, session, unavailable, retry, and ambiguous-outcome messages in `src/shared/i18n/translations.ts`.

**Checkpoint**: Rejected or uncertain submissions remain understandable and never display an unconfirmed success state.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Keep the contract and operator-facing validation guide aligned with the delivered behavior.

- [x] T014 Update `specs/004-add-issues/contracts/issue-creation.md` and `specs/004-add-issues/quickstart.md` to match the implemented response shape, metadata fallbacks, and deployment-specific field behavior.
- [x] T015 Complete the combined acceptance matrix in `specs/004-add-issues/quickstart.md`: verify standard error, permission, expired-session and ambiguous-outcome behavior in isolated tests; use the authorized enterprise success flow for project metadata, exactly one persisted creation, keyboard/pending controls and the two-minute limit. Record evidence and deployment-specific limitations without inducing enterprise failures.
  - Partial evidence recorded on 2026-10-13: enterprise project `turiguanq` (3298), issue 80569, one confirmed creation, project metadata, local validation, keyboard controls, pending-state protection, persistence and missing-session rejection. The revised quickstart accepts isolated upstream-validation, permission-rejection, session-expiry and ambiguous/unavailability evidence. Closed on 2026-10-13 under the user-approved combined criterion: 27 unit, 28 simulated-browser and 9 real local checks pass, including the valid-but-expired session regression; lint, TypeScript and formatting pass. Enterprise limitations remain recorded rather than claimed as tested.

- [x] T016 Add an isolated Redmine 6.1.5/SQLite Docker environment, repeatable seed, dedicated app process and seven real REST/browser checks; document use and local acceptance results in `docs/redmine-local-testing.md`. This supplies the real local error/permission evidence for combined T015 acceptance.

---

- [x] T017 Add account-scoped read diagnostics with five fixed GET probes, safe JSON export, session handling and automated checks with local creator and reader accounts; document in `docs/redmine-diagnostics.md`. Read diagnostics alone do not complete T015.

- [x] T018 Align ordinary-user scope across diagnostics, standard filters, saved criteria and project-scoped creation metadata; remove the administrator API Key from `scripts/redmine-test/seed.rb` and `tests/redmine/fixture.ts`, adapt automated checks, and update `docs/redmine-diagnostics.md`, `docs/redmine-local-testing.md` and the architecture/testing guides. T015 uses the combined acceptance criterion above.

## Dependencies & Execution Order

### Session and documentation follow-up (2026-10-13)

- [x] T019 Clear missing/expired creation sessions before returning 401 in `src/modules/issues/handlers/issues-route.ts`, preserving denial if cleanup fails. Extend the existing expired-session browser regression to verify the deletion header and cookie removal without sending a Redmine write.
- [x] T020 Align specification status, checklist, plan and acceptance/testing notes with the delivered hooks/schemas/components and the pending SC-003 first-time-user evaluation. Preserve the completed combined T015 acceptance and verify unit/browser tests, lint, TypeScript, format and build.

Follow-up verification on 2026-10-13: 27 unit and 28 simulated-browser tests pass, including cookie removal and valid-session creation. Lint, TypeScript, formatting and production build pass. Production audit has no known vulnerabilities; the full audit retains only the documented development exception for `braces`. The 9 real local results from T015 are retained as prior evidence, not rerun for this follow-up. No enterprise requests or writes were made; SC-003 remains pending.

### Phase Dependencies

- **Setup (Phase 1)**: No work required.
- **Foundational (Phase 2)**: T001 and T002 can run in parallel; both must finish before the stories.
- **User Story 1 (Phase 3)**: Depends on the foundational schemas and Redmine request support. Within the story, complete T003 and T004 before their handlers; complete the handlers before integrating the form and list.
- **User Story 2 (Phase 4)**: Depends on the US1 creation request, handler, and form. It improves the failure paths of that workflow.
- **Polish (Phase 5)**: Depends on the implemented story behavior; complete T014 before T015.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2; no user-story dependency.
- **US2 (P2)**: Depends on US1 because its recovery behavior extends the create submission flow.

### Parallel Opportunities

- T001 and T002 are independent foundational changes in separate files.
- T009 translations can proceed alongside US1 backend and form work after the copy and field labels are agreed.
- After US1 is complete, T010 adapter error parsing and T013 localized failure strings can be prepared in parallel; T011 depends on T010, and T012 depends on T011.

## Parallel Example: Foundational Work

```text
Task: T001 Define issue creation schemas in src/modules/issues/schemas/issue-creation.ts
Task: T002 Add JSON POST support in src/modules/redmine/helpers/redmine-api.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete the foundational schemas and Redmine request support.
2. Implement project metadata loading, issue submission, the form, and the issue-list entry point.
3. Confirm the authorized happy path against a Redmine project before adding the richer recovery experience.

### Incremental Delivery

1. Deliver US1 as the first usable issue-creation flow.
2. Add US2's actionable rejection handling and safe retry behavior.
3. Align the contract and quickstart documentation after implementation.

## Notes

- Every implementation task names the source or design file it changes.
- Redmine projects visible to a user may still reject issue creation if that user's role lacks the “Add issues” permission.
- Redmine 6+ includes the cited project-scoped custom-field and tracker-field metadata capabilities. Do not rely on the administrator-only global custom-fields endpoint for a regular account.
- Project visibility does not imply the user's “Add issues” permission; handle Redmine's rejection for the authenticated user's own API key.
