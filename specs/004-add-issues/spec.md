# Feature Specification: Add Issues

**Feature Branch**: `004-add-issues`

**Created**: 2026-10-08

**Status**: Implemented; SC-003 usability evaluation pending

**Input**: User description: "Necesito ser capaz de añadir nuevas incidencias."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create an issue (Priority: P1)

As an authenticated user, I can submit a new issue with the information required by my Redmine project so that work can be tracked in the existing Redmine instance.

**Why this priority**: Creating issues is the feature's central user need and delivers value independently.

**Independent Test**: Sign in, open the issue creation flow, complete required fields, submit, and confirm the new issue is accepted and its details are shown.

**Acceptance Scenarios**:

1. **Given** an authenticated user with permission to create issues in a project, **When** they complete the required fields and submit, **Then** the issue is created in Redmine and the user receives confirmation with a way to identify or open it.
2. **Given** a user viewing the issue list, **When** they choose to add an issue, **Then** they can enter the details and submit without losing their existing session.
3. **Given** the user omits a required field or enters invalid data, **When** they submit, **Then** the form identifies what must be corrected and preserves the other entered values.

### User Story 2 - Recover from a rejected submission (Priority: P2)

As a user submitting an issue, I can understand when Redmine rejects the request and correct or retry it without being told the issue was created.

**Why this priority**: Clear failure handling prevents duplicate or lost work and accurately reflects Redmine permissions and validation.

**Independent Test**: Submit invalid data, use an account without permission, and simulate an interrupted submission. Confirm actionable feedback for known rejections and an explicitly unknown outcome for an ambiguous interruption, with the draft retained in both cases.

**Acceptance Scenarios**:

1. **Given** the user lacks permission to create issues in the selected project, **When** they submit, **Then** the user sees an actionable failure and no success confirmation.
2. **Given** Redmine definitively rejects the submission, **When** the user addresses the reported problem and submits again, **Then** the form retains the entered values and allows another submission.
3. **Given** the connection is interrupted after a submission may have reached Redmine, **When** the app cannot determine whether the issue was created, **Then** the app reports an unknown outcome, retains the draft, and asks the user to check Redmine before explicitly retrying.

### Edge Cases

- The selected project has different trackers, categories, custom fields, or allowed values than another project; the form must reflect the options available to the user.
- Redmine accepts the issue but the response is interrupted; the interface must report an unknown outcome, retain the draft, and require the user to verify in Redmine before explicitly retrying. It must not auto-resubmit.
- Project or field metadata is being fetched or refreshed; dependent form controls cannot be changed or submitted until the current project's options finish validating.
- The user session expires before submission; the user is asked to authenticate again and is not shown a false success.
- The issue description is empty or contains long text or special characters; validation and submission must preserve the entered content.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide an entry point for authenticated users to start creating an issue.
- **FR-002**: The system MUST let users select a project available to them and provide the issue information required for that project, including an available tracker and applicable standard or custom fields.
- **FR-003**: The system MUST validate required values and report field-level validation errors while preserving entered values.
- **FR-004**: The system MUST submit the issue using the signed-in user's authorized Redmine access and MUST respect Redmine's project permissions, including the permission to add issues, and validation rules.
- **FR-005**: The system MUST confirm creation only after Redmine confirms that the issue was created, and MUST provide enough information to locate the new issue.
- **FR-006**: The system MUST communicate upstream validation, permission, session, and availability failures without exposing credentials or claiming success; when Redmine provides validation details, the system MUST present them in a form the user can act on.
- **FR-007**: The system MUST prevent repeated submissions while a creation request is pending. After a confirmed rejection, it MUST preserve the draft and allow a retry once the cause is addressed. When the outcome is unknown, it MUST NOT resubmit automatically and MUST ask the user to verify in Redmine before explicitly retrying.
- **FR-008**: The create-issue flow MUST be usable with keyboard navigation and accessible labels and validation feedback.
- **FR-009**: While project or project-specific creation options are loading or revalidating, the form MUST disable fields that depend on those options and prevent submission until metadata matches the selected project. A retry control MUST become available after a metadata request fails.

### Key Entities _(include if data involved)_

- **Issue**: A work item to be created in Redmine, including project, tracker, subject, description, and any fields required or allowed by that project.
- **Project**: A Redmine workspace that determines issue creation permissions, trackers, and applicable required fields.
- **Creation result**: A Redmine-confirmed issue, a confirmed validation or permission rejection, or an unknown outcome when the request may have reached Redmine but its response was interrupted.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authorized user can submit a valid issue and reach a clear confirmation in no more than 2 minutes, excluding time spent waiting for Redmine.
- **SC-002**: In acceptance evaluation, 100% of valid submissions confirmed by Redmine are shown as successful, and 100% of rejected submissions are shown without a success claim.
- **SC-003**: At least 90% of first-time users can complete issue creation without help when given a project and the issue details.
- **SC-004**: Users can identify and correct every required-field error from the form without losing other entered values.

### Evaluation status

T015 is complete under the approved combined acceptance criterion recorded in [quickstart.md](quickstart.md#combined-acceptance-evidence). SC-003 remains pending: no first-time-user study has been recorded, and automated checks or the authorized enterprise creation do not establish the 90% completion rate. The target remains unchanged; evaluating it requires representative first-time users and a recorded completion rate.

## Assumptions

- Users are already authenticated through the existing application session; issue creation does not introduce a new authentication flow.
- The deployed Redmine version is reported by the server maintainer as 6 or newer, and the REST API is enabled.
- Application workflows support ordinary users without administrator privileges or global custom-field discovery. Administrator login is not blocked.
- Each user authenticates with their own Redmine API key. The instance remains authoritative for projects visible to that user, project-specific fields, validation, and the user's permission to add issues.
- Initial scope is manual creation of one issue at a time; bulk creation, attachments, and advanced workflow transitions are excluded unless required fields in the instance demand them.
- A successful creation response provides an issue identifier or equivalent information sufficient to locate the issue.

## References

- [Redmine REST API: Issues](https://www.redmine.org/projects/redmine/wiki/Rest_Issues) documents issue creation attributes, project-specific issue categories, custom fields, and issue creation.
- [Redmine REST API: Projects](https://www.redmine.org/projects/redmine/wiki/Rest_Projects) documents listing accessible projects and retrieving trackers, categories, and custom fields.
- [Redmine REST API](https://www.redmine.org/projects/redmine/wiki/Rest_api) documents API authentication requirements and validation failures.
- [Redmine Issues](https://www.redmine.org/projects/redmine/wiki/RedmineIssues) describes the administrator-configured “Add issues” permission.
