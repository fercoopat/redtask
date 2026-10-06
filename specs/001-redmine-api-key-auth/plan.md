# Implementation Plan: Redmine API Key Authentication

**Branch**: `001-redmine-api-key-auth` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-redmine-api-key-auth/spec.md`

## Summary

Replace the starter page with an API-key sign-in flow backed by server-side Redmine requests. Verify the key against the configured instance, create a persistent encrypted session cookie, then display the first page of issues. Keep the key out of client-readable storage, URLs, and logs. Use the existing Next.js App Router as a small backend-for-frontend and add `iron-session` for encrypted stateless sessions.

## Technical Context

**Language/Version**: TypeScript 5; Node.js 24.15.0 locally. The user confirmed the production environment can use Node.js 22.13+ as required by `iron-session` v9.

**Primary Dependencies**: Next.js 16.3.8 App Router, React 19.2.8, SWR 2.5.1, React Hook Form 7.89.0, Zod 4.6.5, Tailwind CSS 4, DaisyUI 5.7.47; add `iron-session` v9 for encrypted persistent sessions.

**Storage**: One encrypted, stateless, persistent cookie per browser. No database or server-side key storage.

**Testing**: Existing scripts provide `pnpm lint` and `pnpm build`, with no test runner installed. Validate live authentication and issue retrieval with the manual acceptance scenarios in `quickstart.md` against an API-enabled Redmine instance.

**Target Platform**: Next.js 16 App Router on the Node.js runtime; production served over HTTPS.

**Project Type**: Single web application. Existing application routes and layout live under `src/app/`.

**Performance Goals**: A user with a valid key completes sign-in in under one minute. Upstream requests have a bounded timeout so a failed Redmine connection does not leave the interface pending indefinitely.

**Constraints**: A single Redmine base URL is supplied by server configuration, never by the browser. Redmine REST API authentication must be enabled by its administrator. Session expiry is 14 days; explicit logout clears the cookie. Redmine errors vary by version, so ambiguous authentication failures must not be described as definitively invalid keys.

**Scale/Scope**: One configured Redmine instance, one signed-in user per browser session, and the first 25 issues visible to that Redmine account. No issue filtering, editing, or other Redmine resource workflows are included.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Secure Redmine Access**: Pass. Verify keys on the server; keep the key only in a signed and encrypted `HttpOnly` cookie; never return it to client code or put it in a URL or log.
- **Native Stack**: Pass. Use the installed form, validation, mutation, and styling tools. `iron-session` is one justified addition because the project has no session library and must persist a confidential credential safely across browser restarts.
- **Accessible, Consistent UI**: Pass. Use labeled, keyboard-operable DaisyUI controls with visible focus and field-level validation feedback.
- **Validated Data Flows**: Pass. Validate the key at both the form and server boundaries; authorize every protected request and map Redmine failures without leaking responses or secrets.
- **Focused Delivery**: Pass. Keep one configured instance, avoid a database, and limit the post-login view to one page of issues.

## Phase 0: Research

See [research.md](research.md). Decisions resolve the session, API-key verification, issue-list, and version-compatibility questions. The currently unknown Redmine version is handled through a safe fallback error message rather than a blocking assumption.

## Phase 1: Design & Contracts

See [data-model.md](data-model.md), [contracts/auth-and-issues.md](contracts/auth-and-issues.md), and [quickstart.md](quickstart.md).

## Project Structure

### Documentation (this feature)

```text
specs/001-redmine-api-key-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── auth-and-issues.md
```

### Source Code (repository root)

```text
src/app/
├── page.tsx                         # Redirect according to the current session
├── login/page.tsx                   # API-key sign-in form
├── issues/page.tsx                  # Authenticated initial issue list
├── api/auth/session/route.ts        # Create and clear session
├── api/issues/route.ts              # Authenticated first page of Redmine issues
├── components/
│   ├── login-form.tsx               # React Hook Form + Zod + SWR mutation
│   └── issue-list.tsx               # Issue list with SWR loading and error states
└── lib/
    ├── redmine.ts                   # Server-only Redmine requests and safe DTO mapping
    ├── session.ts                   # Server-only iron-session configuration/access
    ├── config.ts                    # Validated server-only environment configuration
    └── schemas.ts                   # Shared API-key input validation
```

**Structure Decision**: Keep the existing single Next.js App Router application under `src/app`. Route Handlers form the same-origin backend boundary required to keep Redmine credentials server-side; shared server modules centralize session and Redmine access.

## Complexity Tracking

| Addition or trade-off     | Why needed                                                                              | Simpler alternative rejected because                                                                                                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iron-session` dependency | The API Key must support a persistent session and stay confidential in browser storage. | A hand-rolled encrypted cookie would duplicate security-sensitive session code; a database would add infrastructure and dependencies solely for one session.                                                                                                                                                      |
| Stateless 14-day session  | Matches persistence across browser restarts without adding a database.                  | A server-side session store enables immediate per-session revocation but has no configured storage service in this project. `ponytail:` a stolen cookie can be replayed until expiry or upstream key revocation; add a server-side store if immediate revocation or per-device session control becomes necessary. |
