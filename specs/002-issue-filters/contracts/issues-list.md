# Issues List Contract

## Application endpoint

`GET /api/issues`

Requires the existing authenticated Redmine session. Query inputs select a page and optional filter criteria.

| Parameter                   | Meaning                                                                                          | Default / validation                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page`                      | One-based result page                                                                            | `1`; positive integer.                                                                                                                                                   |
| `pageSize`                  | Issues per page                                                                                  | `10`; one of `10`, `25`, `50`, `100`.                                                                                                                                    |
| `filter[<field>][operator]` | Operator for a standard field in the application catalog or an available filterable custom field | Required for each criterion; must be advertised for that field.                                                                                                          |
| `filter[<field>][value]`    | One or more values for that criterion                                                            | Required unless the chosen operator takes no value; validate against the field type. Use Redmine-provided choices when available, otherwise accept a user-entered value. |

Application-level validation converts `page` and `pageSize` to Redmine `offset` and `limit`. Standard filter fields and operators are allowlisted according to the application's supported catalog. Custom fields are offered only when they are filterable and metadata is available to the signed-in account. Input is safely encoded when constructing the upstream request. Criteria are combined with AND semantics. Since Redmine does not expose a general filter-discovery endpoint, an instance may reject a filter from the application catalog; that rejection is surfaced as a recoverable upstream error and the application never retries without that criterion.

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
