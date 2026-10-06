# Data Model: Redmine API Key Authentication

The API Key is held only in the encrypted session cookie and server-side request handling. Redmine responses are processed in server memory; the minimal issue summaries defined below are returned to the browser for display. This feature adds no database tables.

## Redmine Instance

The one company Redmine installation configured by the operator.

| Field     | Type | Rules                                                                                |
| --------- | ---- | ------------------------------------------------------------------------------------ |
| `baseUrl` | URL  | Server configuration only; HTTPS required in production; no browser-supplied target. |

## API Key

The Redmine user's bearer credential.

| Field   | Type          | Rules                                                                                                                                                                                                           |
| ------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value` | secret string | Required and non-empty after trimming input whitespace. Never returned by application endpoints, rendered into HTML, written to logs, or placed in a URL. Sent upstream only in the `X-Redmine-API-Key` header. |

Lifecycle: entered in the login form → submitted once to the app server → verified with Redmine → held in a signed and encrypted session cookie for the session lifetime → discarded on logout, expiry, or detected upstream rejection.

## Authenticated Session

An authenticated app session for one Redmine identity.

| Field       | Type               | Rules                                                            |
| ----------- | ------------------ | ---------------------------------------------------------------- |
| `apiKey`    | secret string      | Encrypted within the cookie; server-only after login.            |
| `userId`    | Redmine identifier | Required; returned by the current-user response.                 |
| `login`     | string             | Required for account identification; minimal identity data only. |
| `expiresAt` | timestamp          | Maximum lifetime 14 days; expired sessions are unauthenticated.  |

State transitions: `anonymous → verifying → authenticated`; rejected credentials return to `anonymous`; network failure returns to `anonymous` with a retryable error; `authenticated → anonymous` on logout, cookie expiry, or detected upstream key rejection.

## Issue Summary

A read-only, display-safe representation of one item from the first Redmine issue-list page.

| Field        | Type           | Rules                             |
| ------------ | -------------- | --------------------------------- |
| `id`         | integer        | Redmine issue identifier.         |
| `subject`    | string         | Display as plain text.            |
| `project`    | string         | Project name if present.          |
| `status`     | string         | Current status name if present.   |
| `priority`   | string         | Priority name if present.         |
| `assignedTo` | string or null | Assignee display name if present. |
| `updatedAt`  | timestamp      | Redmine update time if present.   |

Only fields used by the first issue list are mapped to the browser. Issue descriptions, journals, attachments, user email, and API keys are excluded.
