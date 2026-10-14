# Feature Specification: Issue Filters

**Feature Branch**: `002-issue-filters`

**Created**: 2026-10-07

**Status**: Implemented; deployed-instance acceptance and SC-003 usability evaluation pending

**Input**: User description: "Necesito ser capaz de filtrar los issues mediante la mayor cantidad de filtros posibles, los filtros pueden ser personalizables."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Filter the issue list (Priority: P1)

As a Redmine user, I want to combine filters for the issues I can access so I can quickly find the work relevant to me.

**Why this priority**: Finding a relevant subset of issues is the core value of this feature.

**Independent Test**: Choose multiple available criteria, apply them, and verify that every displayed issue matches all selected criteria.

**Acceptance Scenarios**:

1. **Given** the issue list is open, **When** the user selects one or more filter fields, operators, and values and applies them, **Then** the list contains only issues matching all active criteria.
2. **Given** the user has active criteria, **When** they remove one criterion or clear all criteria, **Then** the list updates to reflect the remaining criteria or the unfiltered list.
3. **Given** a criterion has no matching issues, **When** the user applies it, **Then** the list shows an empty result state and offers a clear way to adjust or clear the filters.
4. **Given** the user changes criteria, **When** results are refreshed, **Then** the active criteria remain visible and the user can tell which filters are affecting the list.

---

### User Story 2 - Personalize and reuse filters (Priority: P2)

As a Redmine user, I want to choose which filters are convenient for me and save useful combinations so I can reuse my preferred ways of finding issues.

**Why this priority**: Personalization reduces repeated setup while the core filtering flow remains independently useful.

**Independent Test**: Select preferred filter fields, save a named set of criteria, leave the issue list, return, and apply that saved set.

**Acceptance Scenarios**:

1. **Given** the user is viewing filters, **When** they customize the available filter controls, **Then** their selected controls are shown and their other available controls can still be added.
2. **Given** the user has configured criteria, **When** they save them with a name, **Then** the saved filter is available for later use by that user.
3. **Given** the user has a saved filter, **When** they apply, rename, update, or delete it, **Then** the issue list and saved-filter collection reflect the chosen action.
4. **Given** a saved filter refers to a field or value that is no longer available, **When** the user applies it, **Then** the unavailable criterion is identified and can be removed or changed without blocking use of the remaining criteria.
5. **Given** Redmine returns choices for a standard filter, **When** the user selects that field, **Then** the available choices appear by name and the submitted criterion uses the corresponding Redmine ID.
6. **Given** filter metadata or an issue query is being validated, **When** the request is pending, **Then** controls that change criteria or the result page are disabled until it settles; session actions and retry after failure remain available.
7. **Given** a selected or saved criterion has a value known to the current catalog, **When** the criterion is displayed, **Then** its human-readable label is shown while its Redmine ID remains the stored and submitted value.

---

### User Story 3 - Paginate issue results (Priority: P2)

As a Redmine user, I want to move through issue results in pages and choose how many issues appear on each page so I can browse large result sets at a comfortable pace.

**Why this priority**: Pagination keeps filtered and unfiltered issue lists manageable and lets users tune the amount shown at once.

**Independent Test**: Open an issue list with more than one page of results, move between pages, change the page size, and verify the displayed issues and page controls update correctly.

**Acceptance Scenarios**:

1. **Given** a list has more issues than its page size, **When** the user opens the list, **Then** only the first page is shown with controls to move between available pages.
2. **Given** the user has not changed the page size, **When** the list loads, **Then** it shows 10 issues per page.
3. **Given** the user chooses a different supported page size, **When** the preference is applied, **Then** the list shows that number of issues per page and remembers the choice for that user.
4. **Given** the user is on a later page, **When** they apply or change filters or page size such that that page no longer exists, **Then** the list returns to a valid page and shows matching results.

### Edge Cases

- When a required value catalog is unavailable to the current account, the UI explains that choices are unavailable and prevents adding or applying a criterion that requires one.
- When a field has no selectable values, it remains possible to clear its criterion and continue using other filters.
- When a Redmine request fails, the current list and filter selections remain understandable, and the user receives a clear failure message with a way to retry.
- When the user applies contradictory criteria, the empty result state is shown without losing the criteria they entered.
- When no criteria are active, the issue list shows the unfiltered issues available to the user.
- When the result set is empty or has only one page, page navigation controls do not offer unavailable pages.
- When the user changes filters while on a later page, the list does not remain on an invalid page.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The issue list MUST allow users to filter accessible issues by the standard fields and criteria implemented by the application and accepted by the connected Redmine instance under the user's permissions.
- **FR-002**: The available filter fields MUST include standard issue fields implemented by the application. This version MUST NOT discover custom-field filters through administrator-only endpoints; custom-filter discovery for ordinary users is deferred.
- **FR-003**: For each field, the interface MUST offer only comparison operators implemented by the application for that field; it MUST show Redmine-provided selectable values when available. When a list field requires a value but its catalog is unavailable, the interface MUST explain that choices are unavailable and prevent adding/applying that criterion. Numeric entry is allowed only for fields explicitly identified as ID fields. Empty/not-empty choices MUST be offered where supported. If Redmine rejects a filter, the interface MUST show a recoverable error and retain the criteria.
- **FR-004**: Users MUST be able to add, configure, combine, edit, and remove multiple criteria in one issue-list query.
- **FR-005**: When multiple criteria are active, the results MUST satisfy all active criteria; this feature does not require user-defined OR groups.
- **FR-006**: Users MUST be able to clear all criteria and return to the unfiltered issue list.
- **FR-007**: Users MUST be able to choose which available filter controls are shown by default, while retaining the ability to add any other available filter.
- **FR-008**: Users MUST be able to save, apply, rename, update, and delete named filter sets for their own account.
- **FR-009**: Saved filter sets and filter-control preferences MUST remain associated with the signed-in Redmine user and MUST NOT be visible to other users unless Redmine explicitly provides a shared-filter feature and it is included in scope.
- **FR-010**: The interface MUST show active criteria, result count when available, and a clear empty state when no issues match.
- **FR-011**: The interface MUST preserve the user's active criteria when a filter request fails and provide a way to retry or adjust them.
- **FR-012**: The interface MUST respect Redmine's permissions and MUST NOT reveal issues, fields, or values the signed-in user cannot access.
- **FR-013**: The issue list MUST display results in pages and provide controls to move to the first, previous, next, and last available page as applicable.
- **FR-014**: The default page size MUST be 10 issues per page.
- **FR-015**: Users MUST be able to select a page size from the supported choices, and the selected page size MUST be remembered for that user.
- **FR-016**: Applying or changing filter criteria or page size MUST return the user to a valid result page, with the first page selected when the current page is no longer available.
- **FR-017**: Page navigation MUST operate on the complete matching result set and MUST communicate the current page and total pages or result count when available.
- **FR-018**: The authenticated filter catalog MUST use Redmine choices for statuses, trackers, and priorities when their optional catalogs are available to the current API Key, and MUST use up to 100 projects from the visible-project list. If a catalog is unavailable or forbidden, value-requiring operators MUST be unavailable for that field until choices can be loaded; this MUST NOT require administrator access. Failure to load the project list remains a catalog error with retry. Author and assignee choices MUST be collected from and deduplicated across memberships of visible projects when the membership API is available to the account, without calling global `/users.json`; if memberships are unavailable, the UI MUST report that choices are unavailable and block criteria requiring a value. Categories and versions without project context MUST likewise report unavailable choices. Manual numeric entry is reserved for fields explicitly labeled as IDs (parent issue and watcher).
- **FR-019**: While filter metadata or issue-list data is being validated, the interface MUST disable controls that change filter criteria, saved-filter selection/actions, visible-filter preferences, page size, or page. Independent actions, including session termination and retry after a request settles with an error, MUST remain available.
- **FR-020**: Active criteria and criteria summarized in the saved-filter selector MUST display the current catalog label when the value ID is available. The application MUST continue storing and submitting the Redmine ID and MUST display an identifiable ID fallback when a label is unavailable.
- **FR-021**: While issue data is loading or refreshing, the interface MUST show an accessible spinner and a localized status message; when existing results are available during revalidation, it MUST identify that they are being updated.

### Key Entities _(include if feature involves data)_

- **Filter Criterion**: A selected issue field, comparison operator, and optional value used to narrow the issue list.
- **Saved Filter**: A named collection of criteria associated with the user who created it.
- **Filter Preference**: A user's choice of which available filter controls appear by default.
- **Page Size Preference**: The user's selected number of issues displayed on each page, defaulting to 10.
- **Issue Page**: A segment of the matching issue results, identified by its position and page size.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can narrow the issue list using at least three simultaneous criteria and verify that all displayed issues meet each criterion.
- **SC-002**: Users can reach every standard issue filter implemented by the application without being limited to a fixed shortlist of controls.
- **SC-003**: At least 90% of users in a usability review can apply, edit, and clear a multi-criterion filter without assistance.
- **SC-004**: Users can save and reapply a named personal filter in under one minute.
- **SC-005**: In acceptance checks, no issue or filter field outside the signed-in user's Redmine permissions is exposed.
- **SC-006**: A user who has not set a page size sees 10 issues per page, and changing pages displays the corresponding issues without duplicates or omissions.
- **SC-007**: A user's selected page size remains in effect when they revisit the issue list.

## Assumptions

- The application defines its standard issue filter fields and operators; Redmine remains the source of truth for whether a requested filter is accepted, for available values, and for access permissions. This version offers standard filters only and does not call `/custom_fields.json`. Project custom-field descriptors remain available for issue creation and do not establish filterability.
- “Personalizable filters” means users can choose their default visible filter controls and save named personal combinations of criteria.
- Multiple criteria are combined with AND semantics; configurable OR groups are outside this feature's initial scope.
- Saved filter sets and display preferences are personal to the signed-in Redmine user.
- Existing issue-list behavior, authentication, and Redmine permissions continue to apply.
- The current global filter UI has no selected-project context for category/version values, and Redmine's global user-list endpoint is administrative. Those filters report unavailable choices until the UI has suitable context or account-scoped data; the app does not elevate permissions or ask users to guess IDs.

## Ordinary-user scope update (2026-10-13)

Saved custom criteria (`cf_*`) remain available for review and correction, but cannot be applied in this version. The API rejects them with 400 `custom_fields_unavailable` without fetching issues. No criterion may be silently discarded. The standard catalog validates the current API Key so revocation still ends the session. Administrator login is not blocked; application behavior does not depend on administrative privileges.
