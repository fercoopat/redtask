# Implementation Plan: My Spent Time

**Branch**: `005-my-spent-time` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-my-spent-time/spec.md`

## Summary

Build a dedicated, read-only personal time report with a date range, project and activity filters, a paginated detail table, total hours, a time trend, and a distribution chart switchable between project and activity. Reuse the authenticated Redmine proxy, Zod schemas, SWR hooks, and accessible UI conventions already in the application. The server fetches and validates the complete matching Redmine result, applies filters and calculates summaries, then returns only the requested detail page; do not present partial totals after a page failure.

## Technical Context

**Language/Version**: TypeScript, current repository toolchain; Next.js 16.3.8 and React 19 (from `package.json`).

**Primary Dependencies**: Existing Next.js App Router, React, SWR, Zod, Tailwind CSS, and DaisyUI; `@tanstack/charts` 1.1.0 with the React SVG adapter for charts.

**Storage**: None. The report is read from Redmine on demand. Do not persist report entries or credentials in browser storage.

**Testing**: `node:test`/`tsx` for schemas, aggregation, adapters, and route behavior; Playwright with the existing local Redmine fixture for authenticated end-to-end states. Validation commands are documented in `quickstart.md` and are not executed during planning.

**Target Platform**: Existing authenticated web application and the user's configured Redmine REST API.

**Project Type**: Next.js web application with same-origin API routes and feature modules.

**Performance Goals**: For the default current-month view, show the complete report promptly under the existing acceptance target of finding the total within 30 seconds. Redmine requests are paginated and serially bounded to the complete matching count. No hard upstream latency or throughput SLA is specified.

**Constraints**: Use the signed-in user's Redmine API key and session user ID; never accept a user ID from the browser, require administrator privileges, call global custom-field APIs, or cache the report across users. Redmine requests are bounded to that user and date range; project and activity filters apply to the complete personal result on the server. Derive the default month in the deployed app's configured time zone, which must match Redmine's configured time zone; keep query bounds as date-only values. Group trend buckets daily for ranges up to 31 days, weekly from 32 through 366 days with weeks starting Monday, and monthly for longer ranges. Limit detail pages to 100 rows (25 by default). A failed or malformed upstream page invalidates the report response rather than yielding a partial total. Preserve decimal-hour meaning when aggregating and presenting hours.

**Scale/Scope**: One user's time entries for a selected date range. The server follows Redmine's `total_count`, `limit`, and `offset` across every matching page, applies project/activity filters, calculates totals and chart aggregates, and returns the requested page of matching details. Each table-page request repeats the bounded retrieval and aggregation; the browser receives one detail page and the summaries.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle / constraint    | Gate | Plan response                                                                                                                                                             |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secure Redmine Access     | PASS | API key remains server-side; user scope is taken from the authenticated session; same-origin route returns `no-store`.                                                    |
| Native Stack              | PASS | Uses one explicitly selected chart dependency, pinned at 1.1.0; the application stays on its existing React stack and uses the default SVG renderer.                      |
| Accessible, Consistent UI | PASS | Use semantic table and controls, visible focus, keyboard operation, text summaries, and chart labels that do not rely on color.                                           |
| Validated Data Flows      | PASS | Validate query parameters and Redmine responses with feature-owned Zod schemas; map failures to the existing error envelope.                                              |
| Focused Delivery          | PASS | Read-only report only; no time-entry mutation, export, or persistence.                                                                                                    |
| Feature-Oriented Source   | PASS | New UI and domain logic live in `src/modules/spent-time`; route files only compose or delegate.                                                                           |
| Ordinary Redmine users    | PASS | Use the signed-in account's key and identity; project/activity choices and entry visibility remain subject to Redmine access. No administrator-only endpoint is required. |

**Gate result**: PASS. No constitution exception or complexity justification is required.

## Project Structure

### Documentation (this feature)

```text
specs/005-my-spent-time/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── spent-time-report.md
└── tasks.md                 # Generated by $speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/spent-time/route.ts
│   └── spent-time/page.tsx
├── modules/
    ├── redmine/
    │   ├── helpers/redmine-api.ts
    │   └── schemas/time-entry-response.ts
    └── spent-time/
        ├── components/
        │   ├── spent-time-dashboard.tsx
        │   ├── spent-time-chart.tsx
        │   └── time-entry-table.tsx
        ├── handlers/spent-time-route.ts
        ├── helpers/
        │   ├── spent-time-query.ts
        │   └── spent-time-summary.ts
        ├── hooks/use-spent-time-report.ts
        └── schemas/spent-time-report.ts
└── shared/
    └── i18n/translations.ts       # Add localized report messages

tests/
├── unit/spent-time.test.ts
└── e2e/spent-time.spec.ts
```

**Structure Decision**: Follow the existing `issues` and `diagnostics` feature boundaries. The App Router page authenticates and mounts the report UI inside the existing per-session SWR cache provider. The same-origin API route delegates to a feature handler. The existing Redmine adapter owns upstream HTTP requests and Redmine response schemas; spent-time query rules, server aggregation, client fetching, and report components stay in the new feature module. Project/activity filters and table pagination are query parameters; each report request processes the complete date-bounded personal result before returning filtered aggregates and the requested detail page. `SpentTimeChart` defines memoized TanStack Charts SVG scenes and keeps translated exact-value summaries in semantic HTML. Add the discoverable report link beside the Diagnostics link in the authenticated issues footer; the home route remains a redirect.

Add all page labels, states, chart text alternatives, and errors to the existing locale dictionaries in `src/shared/i18n/translations.ts` for every supported locale.

## Constitution Check (post-design)

| Principle / constraint    | Result | Design evidence                                                                                                                           |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Secure Redmine Access     | PASS   | The browser sends only report filters. The handler obtains the API key and user ID from the session and does not cache response data.     |
| Native Stack              | PASS   | API validation uses existing Zod/SWR patterns; TanStack Charts provides SVG chart rendering through the existing React stack.             |
| Accessible, Consistent UI | PASS   | The data model and contract require equivalent text summaries, meaningful labels, keyboard-operable filters, and a semantic detail table. |
| Validated Data Flows      | PASS   | Query bounds and every upstream page are validated before complete-set aggregation. Errors use stable application codes and safe details. |
| Focused Delivery          | PASS   | The artifacts contain only read-only reporting behavior; no speculative mutation/export features.                                         |
| Feature-Oriented Source   | PASS   | Source placement follows the established route/module split and kebab-case names.                                                         |
| Ordinary Redmine users    | PASS   | Requests use the user's own API key, identity, and visible project scope; no global custom-field or all-user endpoint is proposed.        |

**Post-design gate result**: PASS. No unresolved technical clarification blocks task generation.

## Complexity Tracking

No constitution violations. No additional architectural layer or dependency is proposed.
