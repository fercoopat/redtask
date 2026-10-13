# Data Model: Add Issues

This feature does not introduce persistent application storage. These models describe the form, server request, and Redmine response.

## Project Choice

- `id`: Redmine project identifier used for submission.
- `name`: Display name.

Projects are returned according to the signed-in Redmine account's visibility. Being visible does not imply permission to add issues.

## Issue Creation Options

- `projectId`: Selected Redmine project.
- `trackers`: Trackers available to the project, each with an identifier and display name.
- `categories`: Optional project categories, each with an identifier and display name.
- `priorities`: Available priority values where the instance exposes them.
- `customFields`: Available issue custom fields with identifier and label; `fieldFormat`, `required` and `possibleValues` are optional enrichment, absent from stock Redmine 6 project descriptors.

The options are transient and instance-specific. Redmine remains authoritative if metadata is incomplete or changes after loading.

## Issue Draft

- `projectId`: Required selected project.
- `trackerId`: Selected tracker when required/available for the project.
- `subject`: Issue subject; required by standard Redmine issue validation.
- `description`: Optional or required according to Redmine configuration.
- `priorityId`, `categoryId`: Optional standard values only when offered by the project and user context.
- `customFields`: Values keyed by Redmine custom-field identifier; scalar or multiple values as exposed by the field.

The application validates request shape, identifiers, and known field rules at its boundary. It does not persist drafts. The client keeps `customFieldValues` as a record keyed by field ID, then transforms only fields from the current project into the API `customFields` array. Switching projects keeps subject/description, clears tracker/category/custom values and retains priority only if still valid.

## Creation Result

- **Created**: Redmine issue identifier and enough safe summary data or URL information to identify/open the new issue.
- **Validation rejected**: Safe field or general messages returned by Redmine, with entered values retained in the form.
- **Forbidden**: The current user cannot add issues to the selected project.
- **Unauthenticated**: The app session is missing/expired or the stored API key is rejected; the user must sign in again.
- **Unavailable/unknown**: Redmine timed out, was unreachable, or returned an unclassifiable response. If the server may have accepted the request before the connection failed, do not assert that no issue was created.
