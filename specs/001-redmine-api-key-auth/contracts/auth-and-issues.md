# HTTP Contract: Authentication and Initial Issue List

All paths below are same-origin application routes. Redmine credentials are never sent to the browser's Redmine origin or returned in a response. Every response from authentication and authenticated routes, including errors, uses `Cache-Control: no-store`. State-changing requests MUST be same-origin; requests with a body MUST use `application/json`. Reject a state-changing request whose `Origin` does not match the application's origin.

## `POST /api/auth/session`

Verify the submitted API Key against the configured Redmine instance and create a persistent session.

**Request**

```json
{ "apiKey": "<user-provided secret>" }
```

**Success — `200 OK`**

Sets a 14-day signed and encrypted `HttpOnly` session cookie. Returns only the public account summary:

```json
{ "user": { "id": 42, "login": "jdoe" } }
```

**Errors**

| Status | Meaning                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------- |
| `400`  | Missing, empty, or malformed API Key field.                                                                    |
| `401`  | Redmine rejected the key.                                                                                      |
| `403`  | The request origin is not allowed or Redmine explicitly reports that REST API access is disabled or forbidden. |
| `415`  | Request content type is not `application/json`.                                                                |
| `502`  | Redmine returned an unexpected response.                                                                       |
| `503`  | Redmine could not be reached or timed out.                                                                     |
| `500`  | The app could not create the session.                                                                          |

On versions where disabled REST API and invalid keys both produce `401`, the user-facing error must mention both possibilities rather than claim certainty. Error bodies contain safe messages only, never upstream response bodies or the submitted key.

## `DELETE /api/auth/session`

Destroy the app session and expire its cookie. The response uses `Cache-Control: no-store`.

**Success — `204 No Content`**. This only disconnects the browser from this app; it does not revoke or rotate the Redmine API Key.

**Failure — `500 Internal Server Error`** with a generic safe error body. Do not expose secrets or upstream response bodies.

## `GET /api/issues`

Fetch the first page of issues available to the current Redmine account. The server requests the Redmine default page (25 issues), maps only fields needed by the list, and returns `Cache-Control: no-store` on success and error responses.

**Success — `200 OK`**

```json
{
  "issues": [
    {
      "id": 123,
      "subject": "Example issue",
      "project": "Example project",
      "status": "In Progress",
      "priority": "Normal",
      "assignedTo": "Jane Doe",
      "updatedAt": "2026-10-06T12:00:00Z"
    }
  ],
  "totalCount": 1,
  "offset": 0,
  "limit": 25
}
```

**Errors**

| Status | Meaning                                                                            |
| ------ | ---------------------------------------------------------------------------------- |
| `401`  | No valid app session or Redmine rejected the stored API Key; clear the app cookie. |
| `403`  | Redmine does not permit access to the requested issue list.                        |
| `502`  | Redmine returned an unexpected response.                                           |
| `503`  | Redmine could not be reached or timed out.                                         |
| `500`  | The app could not load the issue list.                                             |

Responses follow Redmine's own permissions for the authenticated account. The app must not use administrator credentials or impersonation headers.
