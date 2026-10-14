# Implementation Plan: Add Issues

**Branch**: `004-add-issues` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-add-issues/spec.md`

## Summary

Add an authenticated create-issue flow to the existing issue workspace. Reuse the server-side Redmine adapter and session, expose project and project-specific field options through authenticated same-origin routes, submit one validated issue to Redmine, and report confirmed creation, actionable rejection, or an unknown outcome if the response is interrupted. Redmine remains authoritative for project metadata, permissions, and final field validation.

## Technical Context

**Language/Version**: TypeScript 5, React 19

**Primary Dependencies**: Next.js 16, React Hook Form, Zod 4, SWR 2, next-intl, Tailwind CSS, DaisyUI

**Storage**: None for issue drafts; Redmine is the system of record and the existing encrypted session holds the API key.

**Testing**: Unit and simulated-browser checks plus isolated real Redmine validate standard errors, permissions, expiry and uncertain outcomes. T015 combines that coverage with the recorded enterprise metadata and successful creation acceptance described in `quickstart.md`. Expired-session creation returns 401 and removes the stale cookie before any Redmine write. SC-003 remains pending a first-time-user evaluation; automated checks do not establish its 90% completion rate. Use the scripts and isolation rules in the testing guide.

**Target Platform**: Existing Next.js web application

**Project Type**: Web application

**Performance Goals**: Show request pending state immediately; create-form metadata and submission use the existing Redmine request timeout and no-store behavior.

**Constraints**: Redmine credentials stay server-side. State-changing app requests must be same-origin and JSON. Validate request and upstream response data. Preserve per-user and per-project Redmine permissions. The server maintainer reports Redmine 6 or newer with REST API enabled; field configuration still varies by project and tracker. Use project-scoped metadata and do not call administrator-only global custom-field endpoints for a regular user.

**Scale/Scope**: One manually created issue per submission in a project available to the signed-in account.

## Constitution Check

- **Secure Redmine Access**: Pass. Reuse the session API key only in server-side calls; never return it or upstream bodies containing secrets.
- **Native Stack**: Pass. Use installed Next.js, React Hook Form, Zod, SWR mutation support, next-intl, and DaisyUI; add no dependency.
- **Accessible, Consistent UI**: Pass. Use labeled, keyboard-operable controls and visible pending, success, and field/error feedback with existing theme components.
- **Validated Data Flows**: Pass. Validate same-origin JSON at the app boundary, parse Redmine responses, and let Redmine enforce the account's permissions and required fields.
- **Focused Delivery**: Pass. Implement a single-issue workflow only; no bulk issue entry or attachment support.
- **Feature-Oriented Source**: Pass. Keep UI, handler, schemas, and Redmine operations within existing feature modules and route conventions.

No constitution violations are identified.

## Project Structure

### Documentation (this feature)

```text
specs/004-add-issues/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── issue-creation.md
```

### Source Code (repository root)

```text
src/
├── app/api/issues/
│   ├── route.ts                          # Wire GET and POST issue routes
│   └── create-options/route.ts           # Wire authenticated project/field options
├── modules/issues/
│   ├── components/
│   │   ├── issue-list.tsx                # Creation entry point and list refresh
│   │   ├── issue-create-panel.tsx        # Stable controller and confirmation
│   │   ├── issue-create-form.tsx         # Accessible form presentation
│   │   ├── issue-create-project-fields.tsx
│   │   └── issue-create-detail-fields.tsx
│   ├── hooks/
│   │   ├── use-issue-create-form.ts       # Validation, draft and retry guard
│   │   ├── use-issue-create-options.ts    # Feature metadata queries using SWR
│   │   └── use-create-issue.ts            # Feature mutation using SWRMutation
│   ├── handlers/
│   │   ├── issues-route.ts               # Authenticated POST and existing GET
│   │   └── issue-create-options-route.ts # GET creation metadata
│   └── schemas/
│       ├── issue-creation.ts             # Draft, options and result contracts
│       └── issue-create-form.ts          # Form rules for selected-project options
└── modules/redmine/
    ├── helpers/redmine-api.ts            # Metadata reads and issue creation
    └── schemas/                          # External Redmine response contracts
```

The structure reflects the delivered creation flow. Schemas and inferred types stay in their owning module's `schemas` directory. Feature hooks use SWR and React Hook Form directly; presentation components consume those hooks. Shared error contracts and reusable DaisyUI controls remain in `src/shared`. Follow `docs/frontend-hooks.md` and `docs/frontend-architecture.md`; translated labels and feedback live in `src/shared/i18n/translations.ts`.

**Structure Decision**: Extend the existing `src/modules/issues` and `src/modules/redmine` feature modules. Keep Next.js route files as thin exports to module handlers, following existing API routes.

## Metadata loading behavior

The create form disables project and detail fields while either the accessible project list or the selected project's options are validating, including SWR background revalidation. Submission remains guarded by the currently selected project and validated matching options. If metadata fails, the form presents the error and enables retry after the request settles; unrelated session controls remain available.

## Complexity Tracking

No constitution violations or additional architectural layers require justification.
