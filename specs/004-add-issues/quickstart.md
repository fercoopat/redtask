# Quickstart: Validate Issue Creation

## Prerequisites

- Node.js and pnpm versions supported by the repository.
- Dependencies installed.
- A reachable Redmine 6 or newer instance configured for the application, with REST API enabled.
- An ordinary test account/API key and a project where the account has the “Add issues” permission.
- A second project or account for permission-rejection checks, if available.

The project selector currently shows up to 100 projects. Trackers, categories, and custom fields are loaded from project metadata. Priorities are optional when Redmine does not expose the enumeration endpoint; unsupported custom-field formats rely on Redmine validation.

For isolated acceptance against a real Redmine installation, use [the Docker testing guide](../../docs/redmine-local-testing.md). This validates standard errors and permissions against Redmine 6.1.5 locally; T015 combines this evidence with the authorized deployed-instance success flow.

The [read diagnostic](../../docs/redmine-diagnostics.md) performs five checks with the current account and never calls the administrator-only global custom-field endpoint. Read success does not confirm **Add issues**. Project-scoped fields are still used for creation; custom-field filters are deferred.

## Local checks

From the repository root, run:

```sh
pnpm test:unit
pnpm test:e2e
pnpm lint
pnpm exec tsc --noEmit
pnpm format:check
pnpm build
```

See [the testing guide](../../docs/testing.md) for browser installation and fixture isolation. T015 requires both passing isolated checks and the deployed-instance evidence below; documentation alone does not establish application behavior.

Then start the application with its normal development configuration and sign in through the existing flow.

## Acceptance criteria

T015 combines isolated standard-error checks with enterprise verification of project metadata, authorized creation, persistence, keyboard controls and the two-minute limit. Scenarios 3–6 use the synthetic fixture or local Docker instance; do not disrupt the enterprise server, revoke its keys or obtain another enterprise account solely to reproduce standard errors. The existing enterprise evidence remains valid for the tested account, project, Task tracker and Medium priority.

## End-to-end scenarios

1. Open the issue list and choose **Create issue**. Confirm the project selector and its options load without exposing the API key in browser requests.
2. Select a project, enter valid required information, and submit once. Confirm pending feedback appears, Redmine creates one issue, and the success state identifies or opens it. Measure from opening the form to confirmation, excluding time waiting for Redmine; the target is no more than 2 minutes.
3. Omit a required field or submit an invalid value. Confirm the form preserves other values and shows an actionable validation message plus Redmine's validation details; correct it and submit successfully.
4. Submit to a project where the account lacks **Add issues**. Confirm the user sees a permission error and no success claim.
5. In the isolated fixture, make Redmine unavailable during metadata loading and during submission. Confirm a recoverable error is shown and the entered draft remains available. For an ambiguous timeout or server error, confirm the UI reports an unknown outcome, does not auto-resubmit, and requires acknowledgement that Redmine was checked before explicitly retrying.
6. In the isolated fixture, expire the app session and separately use a revoked API key before submission. Confirm access is denied and the user is directed to authenticate again.
7. Use the full form with keyboard only. Confirm every control has an accessible name, focus is visible, and validation/status messages are announced.

## Expected outcome

The list and creation form remain usable for authenticated users, and only a successful Redmine response produces a success state.

## Deployed-instance acceptance: 2026-10-13

This enterprise run originally left T015 partially open. Its results are retained below; the revised combined acceptance criterion is recorded in the evidence matrix. The user authorized their ordinary account via `REDMINE_ACCOUNT_API_KEY` and the project `DFL_BioLinea_BioAudit ERP_2026`, identifier `turiguanq`, ID `3298`. The credential, session cookies, server URL and original API responses are not included in this record.

The five preliminary GET checks returned HTTP 200 with application-compatible responses. The project appears within the selector's first 100 projects and exposes 14 custom fields, all with ID/name only; format, required status and possible values remain unknown. It has no issue categories. The application loaded these options successfully.

### Confirmed creation

- Created issue **80569**, type **Task** (`3`), priority **Medium** (`2`), with all custom-field controls left empty. Redmine accepted this particular submission; this does not establish field requirements for other trackers or workflows.
- Subject: `[PRUEBA Redmine UI] T015 2026-10-13T15:57:44.754Z d459c2b5-5641-4ed1-baff-5fa5d93ca79c`.
- The single authenticated application POST returned **201**. The UI showed confirmation, and subsequent REST reads found exactly one matching issue and verified its ID, project, subject, description, tracker and priority.
- The issue remains in Redmine for review. No deletion, modification, permission change or API Key revocation was performed.

### Acceptance evidence

| Scenario                                          | Deployed-instance result                                                                                                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project metadata and successful creation          | Passed with the ordinary account and the specified project.                                                                                                                                                            |
| Local required-field rejection                    | Empty subject produced a linked field error and no POST; the description was preserved.                                                                                                                                |
| Pending submission                                | Submit and form inputs were disabled during the actual creation request; exactly one authenticated POST was observed.                                                                                                  |
| Keyboard and labels                               | Opening, selecting, correcting and submitting used keyboard navigation; all form inputs had associated labels. This is an automated check, not a human usability study.                                                |
| Persistence                                       | Exactly one matching issue was read back and its submitted content was confirmed.                                                                                                                                      |
| Missing local session                             | Removing only the isolated browser's cookies yielded 401 for protected reads and writes, redirected to login and did not create another issue. Actual TTL expiry and enterprise API Key revocation were not exercised. |
| Real upstream validation rejection and correction | Not exercised in the enterprise: empty custom fields were accepted. Standard rejection/correction is verified by the local Redmine suite.                                                                              |
| Account/project without Add issues                | Not exercised in the enterprise. Standard permission rejection is verified with the local reader account and simulated 403.                                                                                            |
| Unavailability and ambiguous creation outcome     | Not induced in the enterprise. Isolated tests verify recovery, uncertain outcomes and the explicit retry guard.                                                                                                        |

Opening the form through UI confirmation took **7,525 ms**; through independent persistence confirmation, **10,579 ms**, both including waiting for Redmine. Thus the two-minute limit also holds when Redmine wait is excluded. The creation API request took **4,236 ms** end to end; this includes local transport and handler overhead and is not an isolated measurement of Redmine processing. Execution used Next.js 16.3.8, Node 24.15.0 and system Chromium in an isolated browser, with no trace, video or credential-bearing artifacts.

The acceptance app used loopback port 3032 and the ignored `.next-e2e` directory, without changing deployment configuration. Its canonical browser origin was `http://localhost:3032`; an initial login using `127.0.0.1` was rejected by the same-origin check before any issue submission. The application then logged in successfully using localhost.

Before any subsequent write, review issue 80569 and this record. The evidence below determines completion under the revised criterion; do not infer write permissions from preliminary read checks or reproduce disruptive failures on the shared server.

## Combined acceptance evidence

The standard API behavior is described by [Redmine validation errors](https://www.redmine.org/projects/redmine/wiki/Rest_api#Validation-errors) and the [application creation contract](contracts/issue-creation.md). Documentation defines expected behavior; the following tests verify its implementation. The API envelope and UI behavior remain unchanged.

| Scenario                                                 | Application treatment                                                                                                                         | Evidence                                                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upstream 401 / revoked key                               | End the session, remove private UI and require login.                                                                                         | Simulated revoked metadata/creation tests and real local API Key revocation.                                                                                                                        |
| Expired application session                              | Reject creation with 401 `session_required` before contacting Redmine; delete the stale cookie, remove the private draft and return to login. | Simulated test seals a valid session with only `expiresAt` changed to the past; a positive control verifies the original session works. The response expires the cookie and the browser removes it. |
| Permission rejection                                     | Preserve the editable draft and display the safe rejection without claiming success.                                                          | Simulated 403; real local reader account rejected with 422 and no created issue.                                                                                                                    |
| Upstream 422                                             | Bound/sanitize messages, display validation details and preserve the draft for correction.                                                    | Adapter unit test, simulated rejection and real local required-field rejection followed by successful correction.                                                                                   |
| Metadata outage                                          | Display an error, block submission and allow explicit recovery.                                                                               | Simulated priority outage/retry and unit transport checks.                                                                                                                                          |
| Lost creation response                                   | Report an unknown outcome, retain the draft and block retry until the user acknowledges verification.                                         | Simulated connection loss after the fixture records the write; no automatic duplicate, with the guard preserved across hide/reopen.                                                                 |
| Enterprise metadata, authorized creation and persistence | Render project fields and confirm exactly one persisted issue after successful creation.                                                      | Recorded enterprise issue 80569 in project 3298, Task/Medium.                                                                                                                                       |
| Enterprise keyboard, pending controls and timing         | Labeled controls, keyboard submission, disabled pending inputs and confirmation within two minutes.                                           | Recorded enterprise run: 7,525 ms through UI confirmation and 10,579 ms through persistence, including waits.                                                                                       |

T015 is **complete under the revised combined criterion** on 2026-10-13: 27 unit tests, 28 simulated-browser tests and 9 real local Redmine tests pass, including the expired-session regression; lint, TypeScript and formatting pass. This execution made no further enterprise requests or writes and reused the recorded issue 80569 evidence. Enterprise-specific requirements for other trackers, field formats, workflows, accounts or projects remain unverified; this does not imply universal compatibility or administrator capabilities. No additional enterprise write is needed to close this acceptance.

SC-003 remains pending a first-time-user study. No recorded evaluation establishes that at least 90% of new users complete creation without help. The target remains in the specification; automated tests and T015's combined acceptance do not establish this usability metric.
