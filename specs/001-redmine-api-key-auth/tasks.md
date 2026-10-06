# Tasks: Redmine API Key Authentication

**Input**: Design documents from `specs/001-redmine-api-key-auth/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/auth-and-issues.md`, `quickstart.md`

**Tests**: No automated test tasks are included because the specification does not request TDD or a test suite. The final phase runs existing lint/build checks and the manual acceptance scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by the two user stories from `spec.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it edits a separate file and has no unfinished dependency.
- **[Story]**: User story served by the task (`US1` or `US2`).
- Every task includes the target file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the required session package and document local runtime configuration.

- [x] T001 Add `iron-session` v9 to `package.json` and update `pnpm-lock.yaml`.
- [x] T002 [P] Add non-secret `REDMINE_BASE_URL` and `IRON_SESSION_PASSWORD` placeholders with setup notes to `.env.example`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish trusted server configuration, session handling, and DaisyUI styling before building either story.

- [x] T003 [P] Add Zod-validated server configuration in `src/shared/config.ts`; enforce the data-model rule verbatim: “Server configuration only; HTTPS required in production; no browser-supplied target.” Require the session secret to contain at least 32 characters and never log either value.
- [x] T004 [P] Enable DaisyUI 5 in `src/app/globals.css` with the Tailwind CSS 4 directive `@plugin "daisyui";`.
- [x] T005 Implement the `iron-session` v9 wrapper in `src/modules/auth/helpers/session.ts`; enforce the data-model constraints verbatim: `apiKey` “Encrypted within the cookie; server-only after login.”; `userId` “Required; returned by the current-user response.”; `login` “Required for account identification; minimal identity data only.”; and `expiresAt` “Maximum lifetime 14 days; expired sessions are unauthenticated.” Set `HttpOnly`, production `Secure`, `SameSite=Lax`, and `Path=/`.

**Checkpoint**: Runtime configuration, UI component styling, and the shared sealed-session helper are ready.

---

## Phase 3: User Story 1 - Connect to Redmine (Priority: P1) 🎯 MVP

**Goal**: Accept an API Key, identify the Redmine account, and open the first page of that account's issues.

**Independent Test**: With the configured, API-enabled Redmine instance, a valid key opens the issue list; invalid credentials stay signed out; unavailable Redmine produces a retryable safe error.

### Implementation for User Story 1

- [x] T006 [P] [US1] Define the shared API-key Zod schema in `src/modules/auth/helpers/schemas.ts`; enforce “Required and non-empty after trimming input whitespace.” Also enforce “Never returned by application endpoints, rendered into HTML, written to logs, or placed in a URL. Sent upstream only in the `X-Redmine-API-Key` header.”
- [x] T007 [P] [US1] Implement server-only current-user and issue-list requests in `src/modules/redmine/helpers/redmine-api.ts` using the configured URL, `X-Redmine-API-Key`, JSON parsing, a 10-second timeout, `cache: 'no-store'`, and safe error mapping; map `GET /users/current.json` and the first 25 results from `GET /issues.json`.
- [x] T008 [P] [US1] Implement the `POST /api/auth/session` handler in `src/modules/auth/handlers/session-route.ts`, exposed by `src/app/api/auth/session/route.ts`; require a same-origin request with `application/json`, validate JSON with the shared schema, verify identity through `src/modules/redmine/helpers/redmine-api.ts`, create the session through `src/modules/auth/helpers/session.ts`, and return only the account DTO. Set `Cache-Control: no-store` on success and error responses; return generic guidance for ambiguous 401 responses and never return upstream response bodies or secrets.
- [x] T009 [P] [US1] Build the accessible API-key form in `src/modules/auth/components/login-form.tsx` with React Hook Form, `zodResolver`, DaisyUI controls, and `useSWRMutation`; hide the key, prevent repeat submission while pending, show safe errors, and do not persist the key in browser-readable storage.
- [x] T010 [US1] Add the sign-in and entry routes in `src/app/login/page.tsx` and `src/app/page.tsx`; render the form at `/login`, redirect an authenticated visitor from `/login` to `/issues`, and redirect an anonymous visitor from `/` to `/login`.
- [x] T011 [P] [US1] Implement the authenticated first-page issue handler in `src/modules/issues/handlers/issues-route.ts`, exposed by `src/app/api/issues/route.ts`; require a valid session, request only issues available to that Redmine identity, and return a mapped first page with pagination metadata. Set `Cache-Control: no-store` on every response, including errors.
- [x] T012 [US1] Implement the protected issue page and page-level composition in `src/app/issues/page.tsx`, with the list in `src/modules/issues/components/issue-list.tsx`; show the current Redmine login to identify the account, enforce the issue data-model constraints verbatim: `id` is an integer, “Redmine issue identifier.”; `subject` is a string, “Display as plain text.”; `project` is a string, “Project name if present.”; `status` is a string, “Current status name if present.”; `priority` is a string, “Priority name if present.”; `assignedTo` is a string or null, “Assignee display name if present.”; and `updatedAt` is a timestamp, “Redmine update time if present.” Render no more than 25 issues and provide loading, empty, and retryable error states.

**Checkpoint**: A valid API Key independently delivers an authenticated first page of issues without exposing the key.

---

## Phase 4: User Story 2 - Use and end the authenticated session (Priority: P2)

**Goal**: Restore the signed-in state after browser restarts and let the user disconnect.

**Independent Test**: Sign in, close and reopen the browser within 14 days, confirm the issue list returns without re-entering the key, then disconnect and confirm protected content requires sign-in again.

### Implementation for User Story 2

- [x] T013 [US2] Add a `DELETE` handler to `src/modules/auth/handlers/session-route.ts`, exposed by `src/app/api/auth/session/route.ts`; require a same-origin request, destroy/expire the session cookie on logout without revoking the Redmine API Key, return `204` on success or a generic safe `500` on failure, and set `Cache-Control: no-store` on every response.
- [x] T014 [US2] Add the logout SWR mutation control to `src/modules/issues/components/issue-list.tsx` as a semantic, keyboard-operable button with a clear accessible name and visible focus state; show pending state and disable repeat submissions, show success then return to `/login` only after `204`, and on failure keep the current view with a generic retryable error. Return to `/login` on a `401` from issue loading and explain that app logout does not revoke the Redmine API Key.
- [x] T015 [P] [US2] Clear the app session when Redmine rejects the stored key in `src/modules/issues/handlers/issues-route.ts`; return `401` without upstream details so the browser can return to sign-in rather than retaining stale protected content.

**Checkpoint**: Persistent sessions survive browser restarts for at most 14 days, while logout and detected upstream key rejection remove access from the app.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Document deployment requirements and validate the complete feature. T016 may run after setup; T017 runs after both user stories are complete.

- [x] T016 [P] Document Node.js 22.13+, HTTPS, REST API enablement, and secret configuration in `README.md`, linking to `specs/001-redmine-api-key-auth/quickstart.md`.
- [ ] T017 Run `pnpm lint`, `pnpm build`, and the timed sign-in, valid-key, invalid-key, revoked-key, unavailable-instance, restart-persistence, logout, secret-handling, and permission scenarios in `specs/001-redmine-api-key-auth/quickstart.md`; record any instance-version-specific error mapping found.

> Local lint/build and unauthenticated, cross-origin, unavailable-instance, and logout smoke checks passed. Valid/revoked-key, persistence, timed-browser, and real permission scenarios remain pending a configured Redmine instance.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; T002 can run in parallel with T001.
- **Foundational (Phase 2)**: Starts after Setup. T003 and T004 can run in parallel; T005 depends on T001 and T003.
- **User Stories**: Start after the foundation. US1 is the MVP. US2 builds on the authenticated issue page delivered by US1.
- **Polish (Phase 5)**: T016 may run after Setup; T017 waits for both user stories to finish.

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2; it independently delivers sign-in and the initial issue list.
- **US2 (P2)**: Depends on US1's session creation and protected issue page; it adds persistence verification and logout behavior.

### Parallel Opportunities

- T001 and T002 edit separate setup files.
- T003 and T004 edit separate foundational files; T005 follows T003.
- T006 and T007 edit separate files and can run in parallel.
- T008 and T009 can run in parallel once T005–T007 are complete: the route and UI use the same contract but edit distinct files.
- T016 can run independently of code tasks until final validation T017.
- After US1, T013 and T015 can run in parallel; T014 follows T013.

## Parallel Example: User Story 1

```text
After T005, run T006 and T007 in parallel.
After T006 and T007, run T008 and T009 in parallel.
Then run T010 and T011 in parallel; complete T012 after the issue endpoint is ready.
```

## Parallel Example: User Story 2

```text
After US1, run T013 and T015 in parallel because they update separate route files.
Complete T014 after T013 adds the logout endpoint.
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 and stop at its checkpoint.
3. Verify a valid key opens the issue list, while invalid keys and unavailable Redmine remain safely handled.
4. Add US2 to deliver restart persistence, logout, and revoked-key handling.
5. Run the final quickstart and repository checks.

### Incremental Delivery

US1 can be demonstrated as an end-to-end MVP after Phase 2. US2 depends on the session and issue page from US1 and adds the complete persistent-session lifecycle without expanding into issue editing or filtering.

## Notes

- All tasks use the required checkbox/ID format; story tasks carry `[US1]` or `[US2]`, and `[P]` appears only where files can be worked independently.
- Automated test tasks are omitted because neither the specification nor the user requested a test suite. T017 runs the documented acceptance scenarios plus existing lint/build commands.
- The Redmine instance may not distinguish an invalid key from disabled API access on versions before 4.1; preserve the safe combined guidance in the auth route.
