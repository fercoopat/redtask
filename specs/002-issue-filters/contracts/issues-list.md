# Issues List Contract

## Application endpoint

`GET /api/issues`

Requires the existing authenticated Redmine session. Query inputs select a page and optional filter criteria.

| Parameter                   | Meaning                                                  | Default / validation                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page`                      | One-based result page                                    | `1`; positive integer.                                                                                                                                                   |
| `pageSize`                  | Issues per page                                          | `10`; one of `10`, `25`, `50`, `100`.                                                                                                                                    |
| `filter[<field>][operator]` | Operator for a standard field in the application catalog | Required for each criterion; must be advertised for that field.                                                                                                          |
| `filter[<field>][value]`    | One or more values for that criterion                    | Required unless the chosen operator takes no value; validate against the field type. Use Redmine-provided choices when available, otherwise accept a user-entered value. |

Application-level validation converts `page` and `pageSize` to Redmine `offset` and `limit`. Standard filter fields and operators are allowlisted according to the application's supported catalog. This version offers standard filters only. Any `cf_*` criterion receives 400 `custom_fields_unavailable` before an upstream issue query. Saved custom criteria remain available for review and correction. Input is safely encoded when constructing the upstream request. Criteria are combined with AND semantics. Since Redmine does not expose a general filter-discovery endpoint, an instance may reject a filter from the application catalog; that rejection is surfaced as a recoverable upstream error and the application never retries without that criterion.

### Success response

`200 OK`

```json
{
  "issues": [],
  "totalCount": 0,
  "offset": 0,
  "limit": 10
}
```

The response represents the complete matching result set through `totalCount`, while `issues` contains only the requested page. Redmine permissions apply to both the count and returned issues.

### Errors

- `400 Bad Request`: malformed, unsupported, or out-of-range page or filter input; response identifies the invalid parameter without echoing secrets.
- `401 Unauthorized`: session is absent or Redmine rejects the API key; preserve the existing session-clearing behavior for revoked credentials.
- `403 Forbidden`: Redmine refuses access to the requested issue information.
- `502 Bad Gateway` / `503 Service Unavailable`: preserve the existing mapped Redmine failure behavior; the client keeps current criteria and can retry.
- A filter rejected by the connected Redmine instance is returned as a recoverable upstream error; the client retains the criteria so the user can adjust them.

An unsupported or no-longer-available saved criterion must be reported as invalid. The client must not drop it silently and issue a broader request.

## Client preference contract

Store a versioned preference object in browser local storage under a key scoped to the configured Redmine instance and current Redmine user identity. It may contain page size, visible filter controls, and saved filters. It must not contain the API key, session cookie, or other authentication secret. Invalid or unreadable preferences fall back to the default page size and filter controls without blocking the issue list.

Preferences are browser-local and are not synchronized to other devices or written to Redmine.

## Acceptance checks

1. A request with no page or page size returns page 1 with a limit of 10.
2. A valid filter request returns only issues matching every criterion and reports the total matching count.
3. A supported page size and later page return the corresponding slice, with `offset` and `limit` matching the request.
4. Applying changed filters or page size starts on page 1; an out-of-range page resolves to a valid page.
5. Unsupported field/operator/value combinations fail without falling back to unfiltered issues.
6. Preferences for one signed-in user are not loaded under another user's storage key; no credential is present in the stored preference object.

## Standard filter catalog

`GET /api/issues/filters` requires the existing session, verifies the API Key via `/users/current.json`, and returns `{ fields, instance }`, where `fields` is the standard catalog enriched with `values` when available and `instance` identifies the configured Redmine instance for preference scoping. Values use stringified Redmine IDs and display names. The route loads status, tracker, and priority choices from optional catalogs and up to 100 project choices from the current user's visible-project list. It gathers author and assignee values from paginated memberships for those projects, deduplicated by user ID. A forbidden, missing, or unsupported membership endpoint leaves both user fields without choices so the UI reports unavailable choices and blocks value-requiring criteria; no global `/users.json` request is made. A forbidden, missing, or unsupported optional status/tracker/priority catalog is likewise represented by no `values` for that field, and the shared filter schema rejects criteria that require a choice. Failure to load the project list or a membership request for a reason other than forbidden/unavailable remains an error with the uniform error envelope. The route never queries `/custom_fields.json`. Categories and versions remain unavailable without project context. Manual ID entry is reserved for explicitly labeled ID filters (parent issue and watcher). Project-scoped custom fields used for issue creation are independent of this catalog.

The active-criteria badges and saved-filter selector resolve each criterion's stored value ID to the matching catalog label when present. Criteria continue to store and submit IDs. If the current catalog has no matching label, list values are shown as `#<id>`.

### Pending request behavior

While the filter metadata or issue query is being validated, the client disables controls that can change criteria, saved filters, visible filter fields, page size, or page. This uses SWR's validation state so controls remain disabled during background revalidation even when cached data is visible. The issue list shows an accessible spinner and localized status during initial loading and a distinct updating status during refresh. Session termination remains available; retry controls become available when the failed request is no longer pending.
