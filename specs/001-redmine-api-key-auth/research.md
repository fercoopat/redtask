# Research: Redmine API Key Authentication

## Decisions

### Redmine credential verification

- **Decision**: Send the submitted API Key from a server-only module in the `X-Redmine-API-Key` header and request the current-user resource. Do not send the key in a URL or query string.
- **Rationale**: Redmine documents the header as a supported API-key transport and the current-user resource identifies the account whose credentials authenticated the request. REST API access must be enabled by the Redmine administrator.
- **Alternatives considered**: Query-string key, which can leak through URL logs and referrers; user/password authentication, which is outside the user's chosen flow.
- **Source**: [Redmine REST API: authentication](https://www.redmine.org/projects/redmine/wiki/Rest_api); [Redmine REST Users: current user](https://www.redmine.org/projects/redmine/wiki/Rest_Users).

### Persistent session

- **Decision**: Add `iron-session` v9 for a 14-day signed and encrypted stateless cookie. Keep the API Key and only the minimum account identifier in the sealed session. Set `HttpOnly`, `Secure` in production, `SameSite=Lax`, and `Path=/`; use a server-only secret from environment configuration. Do not persist the key in local storage or session storage.
- **Rationale**: The user needs a session to survive browser restarts. Next.js recommends a session-management library for encrypted stateless sessions; the project has no database or session library. The library provides authenticated encryption without maintaining cryptographic code in this application. The local Node runtime is 24.15.0; v9 requires Node 22.13 or later, so production must meet that runtime requirement.
- **Alternatives considered**: A hand-built encrypted cookie, which reimplements security-sensitive code; an in-memory session, which is lost on server restart and unsuitable for multi-instance hosting; a database-backed session, which adds unconfigured infrastructure but allows immediate per-session revocation.
- **Sources**: Next.js 16.3.8 local docs, `node_modules/next/dist/docs/01-app/02-guides/authentication.md` (Session Management); [iron-session README](https://github.com/vvo/iron-session) (encrypted stateless cookies, v9 runtime requirement, and 14-day default TTL).

### Session revocation and expiry

- **Decision**: Logout destroys the app's cookie. An expired or rejected Redmine key clears the local session on the next protected API request. Do not claim that logout revokes the user's Redmine API Key.
- **Rationale**: A stateless cookie has no server-side record to revoke. Redmine's docs do not define a version-independent key-revocation endpoint. The 14-day TTL bounds replay risk if a cookie is copied.
- **Alternatives considered**: Add a database-backed session registry now for immediate revocation. This project has no database and the user has not requested multi-device session management.
- **Security limit**: A stolen sealed cookie remains replayable until its expiry or until the upstream key stops working. Replace the stateless design with server-side sessions if immediate revocation becomes a requirement.

### Redmine issue list

- **Decision**: After sign-in, request the first page of issues from the same server-only Redmine module and display at most the Redmine default of 25 entries. Do not add filters, mutations, or eager loading of issue journals.
- **Rationale**: The user selected the issue list as the first screen. The official API marks Issues stable and supports pagination; Redmine applies its own user permissions to the results.
- **Alternatives considered**: Loading every issue or adding filters now, which is unnecessary for an authentication MVP and risks extra requests and scope.
- **Source**: [Redmine REST API: resource availability and pagination](https://www.redmine.org/projects/redmine/wiki/Rest_api).

### Error mapping and version differences

- **Decision**: Distinguish network/time-out failures from Redmine authorization failures. Treat HTTP 403 as disabled API access when returned. For HTTP 401, show an invalid-key message only where the upstream response makes that distinction; otherwise say the key may be invalid or REST access disabled and direct the user to the administrator.
- **Rationale**: Redmine 4.1.0 changed disabled REST API responses from 401 to 403; older versions may return 401 both for a bad key and disabled REST API. The installed-company version is not specified, so the app cannot safely infer the cause in every deployment.
- **Alternatives considered**: Always label 401 as an invalid key, which can mislead users on older servers.
- **Sources**: [Redmine defect #32315](https://www.redmine.org/issues/32315); [Redmine REST API: authentication](https://www.redmine.org/projects/redmine/wiki/Rest_api).

### Next.js request boundary

- **Decision**: Use App Router Route Handlers for same-origin login/session and issue-list requests. Keep Redmine requests, session decryption, and credential handling in server-only modules. Use SWR mutation for login/logout and SWR for issue reads.
- **Rationale**: This preserves the requested SWR mutation flow while ensuring the browser never calls Redmine directly. Next.js 16's Route Handlers are the App Router HTTP boundary; its data-security guide recommends server-only data access with minimal DTOs.
- **Alternatives considered**: Calling Redmine directly from a Client Component, which would expose the key; a second backend service, which is unnecessary for the current scope.
- **Sources**: Next.js 16.3.8 local docs, `node_modules/next/dist/docs/01-app/02-guides/data-security.md` and `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`.

## Operational Assumptions

- `REDMINE_BASE_URL` is fixed per deployment, server-only, and uses HTTPS in production. Validate configuration at startup; never accept a client-supplied target URL.
- `IRON_SESSION_PASSWORD` is provided outside source control and contains at least 32 characters.
- The production runtime can use Node.js 22.13 or newer, as confirmed by the user for `iron-session` v9.
- Use a bounded 10-second timeout for requests to Redmine. Do not cache authenticated API responses.
- The existing Redmine installation exposes JSON REST resources, has API-style authentication enabled, and permits `/users/current.json` and the issue list for this account.
- Users authenticate with an API Key alone in this interface, as confirmed by the user. This does not assert that API-key access itself requires a separate interactive 2FA exchange.
