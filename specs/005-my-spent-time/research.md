# Research: My Spent Time

**Date**: 2026-10-15

## Decisions

### Read the signed-in user's own Redmine entries

- **Decision**: Use the existing authenticated session's Redmine user ID and API key on the server. Send the user ID as a server-derived `user_id` filter with the requested date range. Never accept an arbitrary user ID from the browser or use an administrator key.
- **Rationale**: Redmine documents the `user_id` listing filter and `/users/current` for identifying the credential owner. The special `user_id=me` form is reported to work but is not documented; using the app session's already-validated numeric identity avoids depending on it.
- **Alternatives considered**: `user_id=me` relies on undocumented behavior. Listing entries without a user filter could show entries the signed-in user is allowed to view that belong to other users, which conflicts with the personal report.

### Bound upstream retrieval and summarize on the server

- **Decision**: Use Redmine's documented user and date range (`from`/`to`) filters. Follow `total_count`, `limit`, and `offset` through every page. Apply project/activity controls to the complete date-bounded personal set on the server, calculate all summaries there, and return only the requested detail page plus distinct filter choices. If any upstream page fails validation or retrieval, fail the report and let the user retry; never calculate totals from a partial set.
- **Rationale**: Totals, charts, selector choices, and rows must agree, while the browser receives only a bounded page of details. Redmine's source exposes activity filters in TimeEntryQuery, but the REST wiki's filter wire syntax is not sufficiently documented to make it a required dependency.
- **Alternatives considered**: Calculating from only the current API page would produce wrong totals and charts. Downloading all time entries without user/date bounds is unnecessarily broad and can expose unrelated records. Returning the complete result to the browser transfers more personal data than the report needs. The selected design re-fetches and aggregates the bounded date range on each filter or page request, increasing upstream work while limiting each browser response.

### Aggregate decimal hours consistently

- **Decision**: Treat Redmine's `hours` value as decimal hours throughout aggregation and label/display the resulting unit explicitly. Do not interpret digits after the decimal point as minutes.
- **Rationale**: Redmine's time-tracking documentation states that decimal time remains decimal in accumulated values (for example, 1.5 hours is 1 hour 30 minutes).
- **Alternatives considered**: Converting the fractional part directly to minutes would misrepresent values.

### Use TanStack Charts for accessible React SVG graphics

- **Decision**: Use `@tanstack/charts` 1.1.0 with its React SVG adapter for the trend (`lineY`) and switchable project/activity distribution (`barX`). Keep exact localized values in adjacent semantic HTML and retain the paginated table as the detailed alternative. Use the package's compact categorical and linear scales; do not import its Canvas renderer.
- **Rationale**: The project runs React 19, which is in the package's supported React peer range. The adapter server-renders accessible SVG and provides keyboard focus, tooltips, axes, and responsive sizing. This replaces hand-built chart geometry while keeping the app responsible for translated context and exact value summaries.
- **Alternatives considered**: Hand-authored SVG and CSS bars minimize dependencies but leave axes, focus, tooltips, and chart interaction to local code. Canvas is unnecessary for these small datasets and does not provide useful server-rendered marks.

### Preserve authenticated failure and cache behavior

- **Decision**: Follow existing same-origin API error handling for missing/expired sessions, forbidden requests, Redmine outages, and invalid responses. Return every report response with `Cache-Control: no-store`; clear the session only for a rejected API key as existing routes do.
- **Rationale**: Time entries are user-scoped data, and the application already has a stable error envelope and session lifecycle behavior.
- **Alternatives considered**: Shared caching risks leaking one user's report into another session; returning partial data can make a valid-looking but incorrect report.

## Evidence and project patterns

- [Redmine REST API: Time Entries](https://www.redmine.org/projects/redmine/wiki/Rest_TimeEntries) documents listing, user/project/date filters, and offset/limit pagination.
- [Redmine REST API: Users](https://www.redmine.org/projects/redmine/wiki/Rest_Users) documents `/users/current` for the identity associated with the API credential; the `/users` collection requires administrator privileges.
- [Redmine REST API: Enumerations](https://www.redmine.org/projects/redmine/wiki/Rest_Enumerations) documents the time-entry activity catalog.
- [Redmine Time Tracking](https://www.redmine.org/projects/redmine/wiki/RedmineTimeTracking) documents issue-level and project-level entries, activities, and decimal-hour display.
- Redmine 6.1 source: [`TimeEntryQuery`](https://github.com/redmine/redmine/blob/6.1-stable/app/models/time_entry_query.rb) includes `user_id` and `activity_id` as query filters; [`TimelogController`](https://github.com/redmine/redmine/blob/6.1-stable/app/controllers/timelog_controller.rb) applies the query scope to API responses and paginates with `total_count`, offset, and limit.
- `src/modules/issues/handlers/issues-route.ts` is the existing authenticated GET handler pattern; `src/modules/redmine/helpers/redmine-api.ts` owns upstream requests and error classification.
- `src/modules/issues/hooks/use-issues-list.ts` is the existing SWR pattern; `src/app/issues/page.tsx` shows server-side authentication and the per-session cache provider.
- Project guides consulted: `docs/frontend-architecture.md`, `docs/frontend-hooks.md`, `docs/security.md`, and `docs/testing.md`.
- TanStack Charts 1.1.0 documentation: [installation and React compatibility](https://tanstack.com/charts/latest/docs/installation), [React adapter](https://tanstack.com/charts/latest/docs/framework/react/reference/chart), and [accessibility](https://tanstack.com/charts/latest/docs/guides/accessibility). Exact dependency version is pinned in `package.json` and `pnpm-lock.yaml`.
- Next.js 16.3.8 local documentation consulted: App Router layouts/pages and Route Handlers. A page file owns the route composition; Route Handlers use Web `Request`/`Response`; authenticated request-bound GET handlers are dynamic and are not cached by default.

## Risks and acceptance checks

- Redmine's visible time-entry permissions can vary with version, project configuration, and plugins. Acceptance must use a normal user's API key and the target instance; no admin read is evidence of normal-user access.
- The stock Time Entries documentation does not guarantee which records every role can view. Treat `403`, denied projects, and incomplete/malformed responses as errors; never widen the query to another user or drop a rejected filter.
- The standard current-user REST response does not document the Redmine instance's configured time zone. Configure the app's current-month calculation to match the target Redmine zone and verify the boundary behavior during acceptance; keep entry dates as calendar dates without timestamp conversion.
- Very broad custom date ranges can produce many entries. The initial default is one calendar month; the server still retrieves all matching upstream pages to compute correct aggregates, and repeats that work for filter/page requests. Measure practical latency during acceptance before considering a range cap or caching strategy.
