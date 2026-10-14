# Data Model: Issue Filters

Issue records remain owned by Redmine. This feature adds only transient query state and non-secret user preferences.

## Filter Metadata

The standard field/operator catalog is defined by the application and enriched per authenticated Redmine instance. A `values` collection contains string-valued Redmine IDs and display labels for statuses, trackers, priorities, up to 100 projects, and users found in the memberships of those visible projects. Membership users are deduplicated by ID. If a required catalog is unavailable or forbidden, `values` is omitted, the UI explains that choices are unavailable, and the shared schema rejects value-requiring criteria for that field. Project choices come from the ordinary visible-project list, and if that request fails, filter metadata fails to load. Project-scoped category/version fields remain unavailable without project context. Manual numeric IDs are allowed only for fields explicitly identified as ID filters (parent issue and watcher).

Display summaries resolve criterion IDs to the current catalog label without changing the stored or submitted ID. An unresolved list value is displayed as `#<id>`.

## Filter Criterion

Represents one issue constraint in an active or saved filter.

| Field      | Meaning                                                              | Validation                                                      |
| ---------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `field`    | Supported Redmine issue filter identifier                            | Must be in the shared standard catalog validated by the server. |
| `operator` | Comparison supported for that field                                  | Must be one of the operators advertised for the field.          |
| `value`    | One or more selected values, or absent for empty/not-empty operators | Type and cardinality must match the field and operator.         |

Multiple criteria are ANDed. User-defined OR groups are out of scope.

## Saved Filter

Named personal collection of criteria stored in the current browser profile.

| Field      | Meaning                                             | Validation                                            |
| ---------- | --------------------------------------------------- | ----------------------------------------------------- |
| `id`       | Stable identifier for editing and deleting the item | Unique within the user's saved collection.            |
| `name`     | User-visible filter name                            | Required, trimmed, non-empty.                         |
| `criteria` | Filter Criterion collection                         | Every criterion must still be supported when applied. |

If a saved criterion is no longer supported, identify it and allow the user to remove or edit it; do not silently omit it and broaden the result set. Saved `cf_*` criteria are preserved for review but are unavailable for application in this version.

## Filter Preference

The user's selected set and order of filter controls shown by default. All other currently available controls remain addable.

## Page Size Preference

The user's selected number of issues per page. Supported values are 10, 25, 50, and 100; a missing or invalid preference resolves to 10.

## Issue Page

The subset of Redmine issues matching the active criteria.

| Field        | Meaning                                             |
| ------------ | --------------------------------------------------- |
| `issues`     | Current page of permission-filtered issue summaries |
| `totalCount` | Total matching issues reported by Redmine           |
| `offset`     | Zero-based position of the first issue in this page |
| `limit`      | Page size used for this response                    |

The application derives current page as `floor(offset / limit) + 1` and total pages as `ceil(totalCount / limit)`. Redmine's returned page metadata is authoritative.
