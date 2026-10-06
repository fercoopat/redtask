# Quickstart: Validate Redmine API Key Authentication

## Prerequisites

- A Redmine instance with REST API access enabled by its administrator.
- A valid user API Key and access to the corresponding account's issue list.
- `REDMINE_BASE_URL` set to the single configured Redmine instance. Production value must use HTTPS.
- `IRON_SESSION_PASSWORD` set to a private secret of at least 32 characters. Do not commit it.
- Node.js 22.13 or newer for `iron-session` v9 and the Next.js development runtime.

## Run

```sh
pnpm install
pnpm dev
```

Open the local application and complete the checks below. Do not put a real API Key in shell arguments, source files, screenshots, browser local storage, or test logs.

## Acceptance checks

1. **Valid key**: Enter a valid API Key. The user identity is confirmed and the issue list opens with no more than the first 25 issues visible to that Redmine user.
2. **Sign-in time**: Start a timer after entering a valid API Key. Stop it when the account is identified and the issue list is usable. Confirm completion takes less than 60 seconds.
3. **Invalid key**: Enter an invalid key. The app remains signed out, shows a safe actionable message, and does not expose the key.
4. **Revoked key**: Sign in, revoke or rotate that API Key in Redmine while the app session is active, then reload the issue list. Confirm Redmine rejection ends the app session, returns the user to sign-in, and hides protected content.
5. **API unavailable**: Stop or block access to Redmine and submit a key. The app shows a retryable connection failure instead of reporting successful authentication.
6. **Session persistence**: Sign in, close the browser, reopen the app within 14 days, and confirm it restores the authenticated state. Confirm the session cookie expires no later than 14 days after creation.
7. **Logout**: Disconnect and reload. Confirm the pending state is shown, successful logout returns to sign-in, and protected issue data is no longer available. Simulate a logout request failure and confirm the app shows a retryable error without reporting success or hiding the current session view.
8. **Secret handling**: Confirm the API Key is absent from URLs, rendered HTML, JavaScript-readable storage, response bodies, and application logs. The browser cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`, and expires within 14 days.
9. **Authorization**: Sign in with a non-admin account and confirm only issues that account can access appear; no request sends an impersonation header.

Run the repository checks:

```sh
pnpm lint
pnpm build
```

## Related design

- HTTP behavior: [contracts/auth-and-issues.md](contracts/auth-and-issues.md)
- Session and issue data: [data-model.md](data-model.md)
