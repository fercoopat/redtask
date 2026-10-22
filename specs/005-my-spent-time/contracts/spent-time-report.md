# HTTP Contract: Spent Time Report

All routes are same-origin application routes. The browser sends report criteria only. The server reads the Redmine API key and current user's Redmine ID from the authenticated session. Every response, including errors, uses `Cache-Control: no-store`. The route is read-only and does not accept a user ID.

## `GET /api/spent-time?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=25&projectId=12&activityId=8`

Returns summaries for the complete date-bounded set and one page of its matching details for the signed-in user. The request parameters are:

- `from`: required inclusive start date in `YYYY-MM-DD` format.
- `to`: required inclusive end date in `YYYY-MM-DD` format; it must not precede `from`.
- `page`: optional one-based detail page, default `1`.
- `pageSize`: optional page size from `1` to `100`, default `25`.
- `projectId` and `activityId`: optional positive integer filters.

The server validates query parameters, then fetches and validates all Redmine pages using the session user's ID and date range. It applies project/activity filters to the complete result, calculates the total and chart aggregates from that filtered set, and returns only the requested detail page. Trend buckets are daily for ranges of 31 days or fewer, weekly for ranges of 32 through 366 days (Monday through Sunday), and monthly for ranges longer than 366 days. Each filter or page change performs a new report request and aggregation. The server MUST NOT accept a client-selected user ID or fetch a broader date range than requested.

### Success — `200 OK`

```json
{
  "filters": {
    "from": "2026-10-01",
    "to": "2026-10-31"
  },
  "entries": [
    {
      "id": 42,
      "spentOn": "2026-10-15",
      "hours": 1.5,
      "project": { "id": 12, "name": "Example project" },
      "activity": { "id": 8, "name": "Development" },
      "issue": { "id": 123, "subject": "Example issue" },
      "comments": "Implementation work"
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 25,
  "totalHours": 1.5,
  "trend": [{ "period": "2026-10-15", "hours": 1.5 }],
  "distribution": {
    "projects": [{ "id": 12, "name": "Example project", "hours": 1.5 }],
    "activities": [{ "id": 8, "name": "Development", "hours": 1.5 }]
  },
  "projects": [{ "id": 12, "name": "Example project" }],
  "activities": [{ "id": 8, "name": "Development" }]
}
```

`issue` and `comments` may be absent. `hours` is decimal hours. Trend and both distributions cover all matching entries, not only the detail page. Project/activity choices are derived from the complete date-bounded personal result so filters remain discoverable even when the current page omits a value.

### Errors

| Status | Meaning                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `400`  | Missing, malformed, or invalid date range.                                                                  |
| `401`  | App session is missing or Redmine rejects its API key; clear a revoked session using the existing behavior. |
| `403`  | Redmine denies access to the user's time entries.                                                           |
| `502`  | Redmine returns an unexpected or invalid payload.                                                           |
| `503`  | Redmine is unavailable or any required page cannot be loaded. No partial entry set is returned.             |

Errors use the existing `{ "error": { "code": "stable_code" } }` envelope, with sanitized details only where actionable. Never expose API keys, raw Redmine responses, or server traces.

## Client behavior

- All query parameters are part of the SWR key. While the report request is loading or revalidating, controls that change report data or displayed pagination are disabled; logout remains available.
- A retry is available after request failure. Date changes do not apply to stale data until the corresponding response succeeds.
- The server paginates matching detail rows. The total, trend, and distributions come from the same complete filtered set, and remain unchanged when only the page changes.
- An empty response is distinct from loading, expired session, and request failure.
- Project/activity selection cannot widen the date range or user scope of the loaded result.
