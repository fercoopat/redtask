# Feature Specification: Redmine API Key Authentication

**Feature Branch**: `001-redmine-api-key-auth`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "Me gustaría empezar por el proceso de autenticación, el usuario entraría su API Key lo que permitiría autenticarse y acceder a las funcionalidades de Redmine API."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connect to Redmine (Priority: P1)

As a Redmine user, I want to provide my API Key so I can enter the modern interface as my Redmine account and use the access already granted to me.

**Why this priority**: Establishing a user's identity and permissions is a prerequisite for every later Redmine workflow.

**Independent Test**: Submit a valid API Key for the configured, API-enabled Redmine instance and confirm the interface identifies the account and opens its authenticated state.

**Acceptance Scenarios**:

1. **Given** the user is not connected, **When** they submit a valid API Key for the configured Redmine instance, **Then** the interface confirms access, identifies the corresponding Redmine account, and opens the agreed first screen.
2. **Given** the user is not connected, **When** they submit an invalid or revoked API Key, **Then** access is denied with a clear message that does not expose the key.
3. **Given** the instance cannot be reached or does not permit API access, **When** the user tries to connect, **Then** the interface explains that the connection could not be completed and lets them try again or contact the administrator.

---

### User Story 2 - Use and end the authenticated session (Priority: P2)

As an authenticated user, I want my connection state to behave predictably and be able to disconnect so I can control access to my Redmine account on this device.

**Why this priority**: Users need to know when they are connected and have a direct way to end access, especially on shared devices.

**Independent Test**: Complete a connection, close and reopen the browser, then disconnect and verify protected content is no longer available.

**Acceptance Scenarios**:

1. **Given** the user is authenticated, **When** they choose to disconnect, **Then** the session ends and protected Redmine content is no longer shown.
2. **Given** the user has an active session, **When** they close and reopen the browser, **Then** the interface restores the authenticated state without asking for the key again, unless the session has expired or been ended.
3. **Given** the user is authenticated, **When** Redmine rejects their revoked API Key on the next issue request, **Then** the app ends the session and no longer shows protected content.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The interface MUST let a user provide their API Key to connect to the single Redmine instance configured for the application.
- **FR-002**: The interface MUST verify that the supplied API Key grants access to the configured instance before showing an authenticated state.
- **FR-003**: The interface MUST identify the Redmine account associated with a successfully verified key.
- **FR-004**: The interface MUST report rejected credentials separately from network failures and identify disabled API access when the Redmine instance reports it; when Redmine does not distinguish invalid keys from disabled API access, the message MUST explain both possibilities and how to proceed.
- **FR-005**: The API Key MUST NOT be displayed after submission, included in user-facing errors, or exposed in application logs.
- **FR-006**: The interface MUST provide a way to end the authenticated session and stop showing protected content.
- **FR-007**: The interface MUST clearly communicate when a user is not authenticated and when a connection attempt is in progress or has failed.
- **FR-008**: A successful connection MUST persist across browser restarts and expire no later than 14 days after creation, unless the user disconnects or Redmine rejects the API Key.
- **FR-009**: The connection flow MUST rely on the API Key alone and MUST NOT ask the user to enter their Redmine password or a separate 2FA code.
- **FR-010**: After a successful connection, the interface MUST open the issue list.

### Key Entities _(include if feature involves data)_

- **Redmine Instance**: The single company-hosted Redmine service configured for the application.
- **API Key**: A secret credential issued for a Redmine user account and used to verify that account's access.
- **Authenticated Session**: The period during which the interface recognizes a user as connected to a Redmine account.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user with a valid API Key can complete the connection flow in under one minute after entering the required information.
- **SC-002**: In acceptance checks, every invalid or revoked key is denied access and no invalid-key attempt is shown as authenticated.
- **SC-003**: In acceptance checks, a successful connection identifies the same Redmine account associated with the supplied key.
- **SC-004**: Users can end a session in one clearly labeled action, after which protected content is no longer accessible in that session.
- **SC-005**: No API Key appears in the interface after submission, user-facing errors, or application logs during acceptance checks.

## Assumptions

- The user already has a Redmine account and can obtain an API Key for that account.
- The target Redmine instance is configured by its administrator to permit API Key authentication.
- The API Key represents the user's existing Redmine identity and permissions; this feature does not create accounts or elevate privileges.
- The Redmine instance address is fixed in application configuration and is not entered by the user.
- A successful API Key connection does not require a separate 2FA prompt in this interface.
- The authenticated session is restored after browser restarts, expires no later than 14 days after creation, and ends earlier on explicit disconnect or detected rejection of the stored API Key.
- The issue list is the first screen shown after a successful connection.
- The initial feature covers connecting, recognizing, and disconnecting a Redmine account. Specific issue, project, or time-entry workflows will be specified separately.
- API Key access is accepted as the sole authentication step in this interface; this decision does not change the organization's Redmine policies or permissions.
