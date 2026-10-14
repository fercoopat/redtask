# HTTP Contract: Issue Creation

All routes are same-origin application routes. Redmine credentials remain server-side. Every response, including errors, uses `Cache-Control: no-store`. State-changing requests must pass the application's same-origin check and use `application/json`.

## `GET /api/issues/create-options`

Returns up to 100 projects visible to the signed-in Redmine account for the project selector. Project visibility does not imply permission to add issues.

In the client, project-dependent creation fields remain disabled while this response is loading or revalidating. A settled error exposes retry; unrelated session actions remain available.

**Success — `200 OK`**

```json
{
  "projects": [{ "id": 12, "name": "Example project" }]
}
```

## `GET /api/issues/create-options?projectId=12`

Returns creation options for a project after confirming it is visible to the signed-in account. Trackers, categories, and issue custom fields come from the project-scoped `include=trackers,issue_categories,issue_custom_fields` response. Priorities are loaded from `enumerations/issue_priorities.json`; only `404` or `501` from that optional endpoint produces an empty priorities list. Authentication errors, outages and malformed responses remain errors. Custom field formats other than selectable fields render as text inputs; Redmine remains authoritative for format and required-field validation.

While this request is loading or revalidating, all creation fields and submission are disabled until the options correspond to the currently selected project. If it fails, the draft remains available and retry is enabled after the request settles.

**Success — `200 OK`**

```json
{
  "projectId": 12,
  "trackers": [{ "id": 2, "name": "Bug" }],
  "categories": [],
  "priorities": [{ "id": 4, "name": "Normal" }],
  "customFields": []
}
```

Stock Redmine 6 project custom fields expose `id` and `name`; `fieldFormat`, `required`, and `possibleValues` are optional enrichment. Missing metadata renders a text field and leaves unknown requirements to Redmine validation. The shape may omit optional metadata unsupported by a particular Redmine version. The handler must validate the project identifier and ensure the requested project is visible to the authenticated account before returning its metadata.

## `POST /api/issues`

Creates one issue in Redmine using the signed-in account's API key. Request fields are limited to the validated create-issue model: project, tracker, subject, description, and selected optional standard/custom fields.

**Request**

```json
{
  "projectId": 12,
  "trackerId": 2,
  "subject": "Example issue",
  "description": "Details",
  "priorityId": 4,
  "customFields": []
}
```

**Success — `201 Created`**

```json
{
  "issue": {
    "id": 123,
    "subject": "Example issue",
    "url": "https://redmine.example/issues/123"
  }
}
```

**Errors**

| Status | Meaning                                                                                                                                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | Malformed JSON, invalid project/field values, or invalid request shape.                                                                                                                                                                                                |
| `401`  | Missing app session or Redmine rejected the stored API key; clear stale session and require sign-in.                                                                                                                                                                   |
| `403`  | Origin rejected or Redmine does not permit the account to create an issue in this project.                                                                                                                                                                             |
| `415`  | Request content type is not `application/json`.                                                                                                                                                                                                                        |
| `422`  | Redmine rejected required or invalid issue fields; return safe actionable validation messages and preserve the draft.                                                                                                                                                  |
| `502`  | Redmine returned an unexpected response or invalid success payload.                                                                                                                                                                                                    |
| `503`  | Redmine could not be reached, timed out, or returned a server error. If the write may have reached Redmine, report an unknown outcome, retain the draft, do not auto-resubmit, and require the user to acknowledge verification in Redmine before explicitly retrying. |
| `500`  | The application could not complete the request.                                                                                                                                                                                                                        |

Error bodies use the shared `{ "error": { "code": "...", "details": [] } }` envelope. Codes are stable application identifiers and the UI localizes them. A `422` response includes up to 10 safe Redmine validation strings in `error.details`; never return API keys or raw upstream response bodies. Because the Redmine API does not provide an idempotency key for issue creation, an explicit retry after an ambiguous result may create a duplicate; the user must verify in Redmine before retrying.

Redmine 6.1.5 can also reject a read-only account with `422`: its safe attributes discard the unauthorized project and validation reports missing project/tracker/status. Preserve those details; do not infer `403` from translated validation text. The real local suite verifies that no issue is created.
