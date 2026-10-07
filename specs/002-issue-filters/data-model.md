# Data Model: Issue Filters

Issue records remain owned by Redmine. This feature adds only transient query state and non-secret user preferences.

## Filter Criterion

Represents one issue constraint in an active or saved filter.

| Field      | Meaning                                                              | Validation                                                       |
| ---------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `field`    | Supported Redmine issue filter identifier                            | Must be in the server-side allowlist for the connected instance. |
| `operator` | Comparison supported for that field                                  | Must be one of the operators advertised for the field.           |
| `value`    | One or more selected values, or absent for empty/not-empty operators | Type and cardinality must match the field and operator.          |

Multiple criteria are ANDed. User-defined OR groups are out of scope.

## Saved Filter

Named personal collection of criteria stored in the current browser profile.

| Field      | Meaning                                             | Validation                                            |
| ---------- | --------------------------------------------------- | ----------------------------------------------------- |
| `id`       | Stable identifier for editing and deleting the item | Unique within the user's saved collection.            |
| `name`     | User-visible filter name                            | Required, trimmed, non-empty.                         |
| `criteria` | Filter Criterion collection                         | Every criterion must still be supported when applied. |

If a saved criterion is no longer supported, identify it and allow the user to remove or edit it; do not silently omit it and broaden the result set.

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
