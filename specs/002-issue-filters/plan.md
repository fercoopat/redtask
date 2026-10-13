# Implementation Plan: Issue Filters

**Branch**: `002-issue-filters` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-issue-filters/spec.md`

## Summary

Let users filter issues with standard fields and operators implemented by the application, without depending on administrator privileges. Custom-field filter discovery for ordinary accounts is deferred. Users can save personal filter sets, choose visible filter controls, and paginate results with 10 issues per page by default. Extend the existing issues request and list flow; persist non-secret personal preferences in browser storage scoped to the Redmine user.

## Technical Context

**Language/Version**: TypeScript 5, React 19

**Primary Dependencies**: Next.js 16 App Router, SWR 2, Zod 4, Tailwind CSS 4, DaisyUI 5 (all already installed)

**Storage**: Browser local storage for page-size, visible-control, and saved-filter preferences; Redmine remains the source of issue data. Do not store API keys or session credentials in preference storage.

**Testing**: Unit, simulated-browser and isolated real-Redmine checks are documented in [the testing guide](../../docs/testing.md), alongside lint, types, format and build.

**Target Platform**: Authenticated web application in current desktop and mobile browsers

**Project Type**: Full-stack web application

**Performance Goals**: Return only the requested issue page from Redmine; do not fetch all issues to filter or paginate in the browser.

**Constraints**: Validate query parameters at the application boundary; preserve the current session and Redmine permission model. Redmine REST filter fields and custom-field discovery depend on the deployed instance and API permissions.

**Scale/Scope**: Issue list, its existing same-origin endpoint, and per-user list preferences. No new database or Redmine administration workflow.

## Constitution Check

| Principle                 | Gate | Plan                                                                                                                                                |
| ------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secure Redmine Access     | PASS | Continue using the authenticated server-side session; preferences contain no credentials and are scoped to the signed-in Redmine user.              |
| Native Stack              | PASS | Use installed Next.js, React, SWR, Zod, and DaisyUI; no dependency additions.                                                                       |
| Accessible, Consistent UI | PASS | Use labeled native controls, keyboard-operable actions, visible focus, and existing theme components.                                               |
| Validated Data Flows      | PASS | Validate filter and pagination query parameters before forwarding a whitelisted query to Redmine; retain existing upstream error handling.          |
| Focused Delivery          | PASS | Extend the existing issues flow and use browser storage; avoid a new persistence service or database.                                               |
| Feature-Oriented Source   | PASS | Keep feature behavior in `src/modules/issues` and Redmine request behavior in `src/modules/redmine`; the existing route remains a thin composition. |
| Permission model          | PASS | Redmine remains authoritative for issue visibility and filter availability; application preferences cannot grant access.                            |

No constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/002-issue-filters/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── issues-list.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/api/issues/route.ts                 # Existing endpoint re-export/composition
├── modules/issues/
│   ├── components/issue-list.tsx            # Filter controls, saved views, page controls
│   ├── helpers/                             # Query parsing and browser preference helpers as needed
│   └── handlers/issues-route.ts             # Validate request and pass options to Redmine
└── modules/redmine/helpers/redmine-api.ts   # Build Redmine issue-list request and map response
```

**Structure Decision**: Keep the existing feature module and Redmine integration boundary. Add a helper only if query validation or preference handling needs a distinct reusable responsibility; do not create empty folders or a new module for this flow.

## Design Decisions

- Filtering and pagination are performed by Redmine for each request, so counts and page boundaries apply to the complete permission-filtered result set.
- The issues endpoint accepts a validated page number, page size, and supported filter criteria. The Redmine helper converts these to Redmine's issue-list query parameters and maps its `total_count`, `offset`, and `limit` response.
- The application provides an explicit catalog of standard issue fields and operators it implements; this version offers standard filters only and verifies the current API Key when loading the catalog. It does not call `/custom_fields.json`. Use Redmine-provided values when available and otherwise accept a user-entered value. Because Redmine has no general filter-discovery endpoint, confirm instance compatibility when a filter is applied; if Redmine rejects it, preserve the criteria and show a recoverable error without retrying as an unfiltered request.
- Page-size options are bounded choices (10, 25, 50, 100); default to 10. Keep pagination state in the request URL/state and persist only the selected page size as a user preference.
- Store saved filters and visible-control preferences in local storage under a key scoped by Redmine base URL and user identity. These are browser-local preferences and do not sync between devices.
- When filters or page size change, request page 1. If a response reveals the requested page is beyond the final page, request the final valid page once.
- All filter, page, and page-size inputs are validated and encoded with URLSearchParams; never interpolate user-controlled query text directly into a URL.

## Risks and Open Constraints

- Redmine's public REST API does not provide ordinary users a general endpoint for discovering every available issue filter. The custom-field definitions endpoint requires administrator privileges, so this version defers custom filters rather than depending on it. Project descriptors used for creation do not establish filterability. Saved `cf_*` criteria remain reviewable and are rejected with 400 without an upstream issue request.
- Redmine versions and plugins can differ in supported filters and operators. The application catalog defines what can be selected; an instance rejection must surface as a recoverable request error, and the client must not silently broaden results.
- Browser-local saved filters are scoped per user and browser profile, but are not synchronized with Redmine or other devices.

## Constitution Check (post-design)

| Principle                 | Result | Evidence                                                                                                           |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Secure Redmine Access     | PASS   | API key remains server-side; local preferences contain only filter values and display choices.                     |
| Native Stack              | PASS   | No package or platform changes.                                                                                    |
| Accessible, Consistent UI | PASS   | Design calls for native, labeled, keyboard-operable controls using existing components.                            |
| Validated Data Flows      | PASS   | Server validates request criteria and retains Redmine response/error handling.                                     |
| Focused Delivery          | PASS   | No database, new dependency, or separate service.                                                                  |
| Feature-Oriented Source   | PASS   | Changes stay in existing `issues` and `redmine` ownership boundaries.                                              |
| Permission model          | PASS   | Filtering executes in Redmine under the authenticated user's API key; no client-side issue fetching for filtering. |

No post-design gate failures.

## Complexity Tracking

No constitution violations requiring justification.
