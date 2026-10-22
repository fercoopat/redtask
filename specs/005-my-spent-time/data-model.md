# Data Model: My Spent Time

## Redmine Time Entry

Represents one validated record returned by Redmine for the authenticated user.

| Field      | Shape                                                  | Rules                                                                                                                          |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`       | Positive integer                                       | Unique entry identifier.                                                                                                       |
| `spentOn`  | ISO calendar date (`YYYY-MM-DD`)                       | Date-only value; do not shift it through UTC timestamp conversion.                                                             |
| `hours`    | Finite positive decimal number                         | Decimal hours as defined by Redmine; retain fractional-hour meaning in totals and labels.                                      |
| `project`  | `{ id: positive integer, name: non-empty string }`     | Required.                                                                                                                      |
| `activity` | `{ id: positive integer, name: non-empty string }`     | Required for a valid record; if an instance omits it, treat the upstream payload as invalid rather than inventing an activity. |
| `issue`    | `{ id: positive integer, subject?: string }` or absent | Optional because Redmine permits project-level time entries.                                                                   |
| `comments` | String or absent                                       | Optional. Display an empty-value label when absent.                                                                            |

The Redmine response may also contain user, author, timestamps, or custom fields. They are not part of this report model and must not be returned to the browser unless a user-visible requirement is added.

## Report Query

| Field                                                                                                         | Shape             | Rules                                                |
| ------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------- |
| `from`                                                                                                        | ISO calendar date | Required; inclusive start.                           |
| `to`                                                                                                          | ISO calendar date | Required; inclusive end and not earlier than `from`. |
| The authenticated user ID is not a query field. The server obtains it from the validated application session. |

## Report View Filters

| Field        | Shape                     | Rules                                                                      |
| ------------ | ------------------------- | -------------------------------------------------------------------------- |
| `projectId`  | Optional positive integer | Must match a project represented in the complete date-bounded entry set.   |
| `activityId` | Optional positive integer | Must match an activity represented in the complete date-bounded entry set. |

These filters are applied by the server to the complete fetched personal result. Changing a filter requests a fresh report response. The total, charts, and visible table page are all derived from the same filtered set.

## Detail Pagination

| Field      | Shape                      | Rules                                               |
| ---------- | -------------------------- | --------------------------------------------------- |
| `page`     | Positive integer           | One-based detail page; defaults to 1.               |
| `pageSize` | Integer from 1 through 100 | Number of detail rows per response; defaults to 25. |

Pagination selects only detail rows. Totals and chart buckets always represent the complete filtered result.

## API Response

Represents summaries for a complete filtered result plus a page of detail rows returned by the internal route.

| Field                    | Shape                            | Rules                                                                                                                              |
| ------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `filters`                | Validated `from` and `to`        | Echoes the date range returned by Redmine.                                                                                         |
| `entries`                | Array of `Redmine Time Entry`    | Contains only the requested page of filtered details.                                                                              |
| `totalCount`             | Non-negative integer             | Number of entries in the complete filtered set.                                                                                    |
| `page`, `pageSize`       | Positive integers                | Effective detail pagination values.                                                                                                |
| `totalHours`             | Finite non-negative decimal      | Sum over every entry in the complete filtered set.                                                                                 |
| `trend`                  | Period/hour buckets              | Complete filtered set grouped daily for ranges ≤31 days, weekly for 32–366 days (Monday–Sunday), and monthly for ranges >366 days. |
| `distribution`           | Project and activity hour groups | Both aggregations cover the complete filtered set.                                                                                 |
| `projects`, `activities` | Distinct choice arrays           | Available values from the complete date-bounded personal result, regardless of active project/activity filter.                     |

## Report View

The server applies optional project/activity filters and derives the total, daily/weekly/monthly trend, project/activity distributions, and requested detail page from the same filtered set. Selector choices come from the complete date-bounded personal result. If upstream pagination fails, no API response is produced. A view with no matching entries has zero hours and explicit empty chart/list states.

## Display State

The UI has four report states: initial loading, complete result (including empty), recoverable error, and session expired. It may show previously loaded data only when its visible filter criteria still match; pending criteria changes must not relabel stale values as current. There is no partial-success state for incomplete upstream pagination.
