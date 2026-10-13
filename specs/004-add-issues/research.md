# Research: Add Issues

## Decisions

### Create issues through Redmine's authenticated REST API

- **Decision**: Submit the issue to Redmine's `POST /issues.json` using the signed-in user's API key from the existing server-side session.
- **Rationale**: Redmine documents issue creation as a stable REST resource and applies the user's own permissions and validation. The existing adapter already centralizes the configured base URL, API-key header, timeout, no-store behavior, and upstream error classification.
- **Alternatives considered**: Calling Redmine directly from the browser would expose the API key and bypass the app's same-origin boundary. Using a privileged or impersonated account would bypass the user's permission model.

### Load projects and fields from the configured instance

- **Decision**: Load projects visible to the current account and request selected-project metadata at runtime, including its trackers, categories, and issue custom fields/options where the instance exposes them. Do not depend on `GET /custom_fields.json` for a normal user; Redmine documents that endpoint as requiring administrator privileges.
- **Rationale**: Enabled trackers and categories are project-specific. Custom field availability varies by project, tracker, version, and instance configuration; hardcoded lists would be unreliable. Redmine's project endpoint supports associated trackers and categories, and project issue custom fields since Redmine 4.2. Tracker `enabled_standard_fields` is available since Redmine 5.0, so treat it as optional.
- **Alternatives considered**: Hardcoded global choices are stale and may submit invalid values. Loading all project metadata at once is unnecessary for a form that operates on one selected project.

### Treat Redmine as the final authority on required fields and permissions

- **Decision**: Validate known field types and required values in the app, then preserve and display Redmine's safe validation messages when the server rejects creation. A project can appear in the project list even if the account lacks the `Add issues` permission; the create response is authoritative.
- **Rationale**: Redmine documents a project role permission named “Add issues” and returns validation errors for invalid or missing fields. REST metadata support differs across versions and cannot be assumed to expose every applicable required field or permission in advance.
- **Alternatives considered**: Claiming the app can pre-filter all projects or fully predict server validation would overstate available metadata and risk inconsistent behavior.

### Keep one issue per submission and omit attachments

- **Decision**: The first release creates one issue at a time without attachments.
- **Rationale**: This satisfies the stated need with the existing request flow and avoids adding upload handling, which is a separate multi-step Redmine capability.
- **Alternatives considered**: Bulk creation and attachment upload add distinct workflows and are outside the specified scope.

## Repository Findings

- `src/modules/redmine/helpers/redmine-api.ts` owns authenticated no-store Redmine requests and validates issue responses with Zod. Extend this adapter rather than creating a second client.
- `src/modules/issues/handlers/issues-route.ts` and `src/modules/issues/handlers/issue-filters-route.ts` show the authenticated API handler and safe error-response conventions.
- `src/modules/auth/helpers/session.ts` provides `getAuthenticatedSession()` and the current user's API key.
- Feature hooks own SWR and React Hook Form; `IssueList` composes the filter panel, stable creation panel and table. Keep translated presentation in components and validation schemas in the owning module.
- `src/app/api/locale/route.ts` demonstrates same-origin, JSON content-type, malformed JSON, and schema validation for a mutation.
- `src/shared/http.ts` provides `jsonResponse`, `NO_STORE_HEADERS`, and `isSameOriginRequest`.

## Redmine References

- [REST Issues](https://www.redmine.org/projects/redmine/wiki/Rest_Issues): issue creation fields and JSON request shape.
- [REST API](https://www.redmine.org/projects/redmine/wiki/Rest_api): API authentication, resource availability, and validation failures (`422` with error details).
- [REST Projects](https://www.redmine.org/projects/redmine/wiki/Rest_Projects): accessible project listing and associated trackers, issue categories, and issue custom fields (some associations are version-dependent).
- [REST Issue Categories](https://www.redmine.org/projects/redmine/wiki/Rest_IssueCategories): project-specific categories.
- [Roles and permissions](https://www.redmine.org/projects/redmine/wiki/RedmineRoles): project roles and the “Add issues” permission.
- [Project settings](https://www.redmine.org/projects/redmine/wiki/RedmineProjectSettings): tracker and issue configuration per project.
- [REST Trackers](https://www.redmine.org/projects/redmine/wiki/Rest_Trackers): tracker resource and version-dependent attributes.
- [REST Custom Fields](https://www.redmine.org/projects/redmine/wiki/Rest_CustomFields): global custom-field definitions require administrator privileges, so avoid this endpoint for account-scoped form metadata.

## Confirmed Deployment Context

- The server maintainer reports that the deployed Redmine version is 6 or newer and REST API access is enabled.
- Users authenticate with their own API keys. Project visibility and the project's “Add issues” permission are distinct; Redmine remains authoritative when creation is attempted.
- Project-specific field configuration still varies, so load metadata for the selected project and tracker and preserve actionable server validation messages.
- Validate these assumptions against a test account and project during the quickstart; do not infer that every account can add issues to every visible project.

## Contract correction after review

Stock Redmine 6 project API custom-field descriptors contain only `id` and `name` ([official project helper](https://github.com/redmine/redmine/blob/6.0-stable/app/helpers/projects_helper.rb)). Additional format, required and selectable-value metadata is optional. Numeric query operators use `>=` and `<=` ([official query model](https://github.com/redmine/redmine/blob/6.0-stable/app/models/query.rb)); saved legacy `>` and `<` criteria remain stored and require explicit review before use.
