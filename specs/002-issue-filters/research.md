# Research: Issue Filters

## Existing application flow

**Decision**: Extend the existing issue-list flow rather than add a parallel search service.

**Rationale**: `IssueList` currently requests `/api/issues`; `issues-route.GET` authenticates the user and calls `getRedmineIssues`; the Redmine helper already parses `total_count`, `offset`, and `limit`. At the initial research date it hard-coded `limit=25`; the implementation now supports bounded page sizes with default 10. The data path can support filtering and pagination by carrying validated request criteria through this flow.

**Alternatives considered**: Fetching all issues and filtering in the browser would bypass Redmine's own query and pagination behavior, add unnecessary data transfer, and risk incomplete or inconsistent results.

## Redmine issue filtering and pagination

**Decision**: Query issues in Redmine with its documented filtering and paging parameters. Preserve the server-side page metadata in the application response.

**Rationale**: The official [Redmine REST Issues documentation](https://www.redmine.org/projects/redmine/wiki/Rest_Issues) documents issue-list `offset` and `limit`, common filters such as project, tracker, status, assignee and parent issue, custom-field filters (`cf_x`) when configured for filtering, and comparison expressions for date fields. The [REST API overview](https://www.redmine.org/projects/redmine/wiki/Rest_Api) documents `total_count`, `offset`, and `limit` in collection responses and supports `page` with a selected limit.

**Alternatives considered**: Client-side filtering/pagination was rejected because it would operate only on the fetched slice unless all issues were downloaded.

## Filter metadata and custom fields

**Decision**: Define an explicit application catalog of standard issue fields and operators. Offer standard filters only in this version; defer custom-filter discovery for ordinary users. Never call `/custom_fields.json` from application workflows. Preserve saved custom criteria for review and reject their application without fetching issues. Since Redmine does not expose a general filter-discovery endpoint, confirm compatibility when a filter is applied and surface instance rejections as recoverable errors without dropping criteria.

**Rationale**: The official [Redmine REST Issues documentation](https://www.redmine.org/projects/redmine/wiki/Rest_Issues) describes common filter parameters but does not provide a general filter-discovery endpoint. Redmine versions and plugins may differ. The [Redmine custom-field REST documentation](https://www.redmine.org/projects/redmine/wiki/Rest_CustomFields) says `GET /custom_fields` returns definitions, including `is_filter` and possible values, but requires administrator privileges. Issue filtering by custom field requires the field to be configured as a filter. A normal user cannot be assumed to have permission to enumerate all definitions. The project-scoped descriptors used for creation contain ID and name and do not establish filterability or format. Thus they cannot replace filter-definition metadata.

**Alternatives considered**: Calling the admin-only endpoint unconditionally would fail for ordinary users. Inferring filterability from issue payload fields can omit fields absent from returned issues and does not establish whether Redmine accepts them as filters.

### Standard filter value choices

**Decision**: Attach names and IDs from Redmine's optional status, tracker, and priority catalogs and from the ordinary visible-project list to the standard filter metadata. Gather author and assignee choices from the memberships of visible projects, matching Redmine's issue-query scope, and deduplicate users across projects. Do not call global `/users.json` or add administrator credentials. If a required catalog is unavailable, explain that choices are unavailable and reject value-requiring criteria rather than ask users to guess IDs. Keep categories and versions unavailable in the global list until project context can provide named options. Manual IDs remain only for explicitly labeled ID filters such as parent issue and watcher. Arbitrary text/name values are not accepted for list filters without a catalog.

**Rationale**: Redmine documents [issue status](https://www.redmine.org/projects/redmine/wiki/Rest_IssueStatuses), [tracker](https://www.redmine.org/projects/redmine/wiki/Rest_Trackers), [priority](https://www.redmine.org/projects/redmine/wiki/Rest_Enumerations), and [visible project](https://www.redmine.org/projects/redmine/wiki/Rest_Projects) catalogs. [Categories](https://www.redmine.org/projects/redmine/wiki/Rest_IssueCategories) and [versions](https://www.redmine.org/projects/redmine/wiki/Rest_Versions) are queried for a specific project, while [listing users](https://www.redmine.org/projects/redmine/wiki/Rest_Users) requires admin privileges. Optional catalogs preserve a usable filter flow on instances that deny or omit a catalog endpoint.

## Saved filters

**Decision**: Persist personal named filter sets and visible-control preferences in browser storage, keyed by Redmine instance and user identity. Keep these values separate from authentication secrets.

**Rationale**: The project has no application database. The [Redmine Queries REST documentation](https://www.redmine.org/projects/redmine/wiki/Rest_Queries) supports listing visible saved queries and applying one with `query_id`, but documents only a GET endpoint and does not offer REST create/update/delete operations. Browser storage meets the per-user, persist-and-reuse requirement without a new service or database.

**Alternatives considered**: Redmine query APIs do not support managing saved query definitions. Adding a database would expand the project infrastructure for browser preferences. Browser storage is local to the user's browser profile and will not sync between devices.

## Page-size choices

**Decision**: Use bounded page-size choices of 10, 25, 50, and 100, with 10 as the default.

**Rationale**: These values provide a useful range and align with Redmine's documented support for explicit `limit`; 10 honors the feature's stated default. The API's reported limit remains the source for displayed page metadata.

**Alternatives considered**: An arbitrary numeric input adds validation and can request impractically large pages without a stated user need.
