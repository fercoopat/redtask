# Quickstart: Issue Filters

## Prerequisites

- The application is configured to reach the intended Redmine instance.
- The signed-in Redmine account has API access and permission to view issues.
- The instance supports the standard issue filters being evaluated. Use an ordinary account; custom-field filter discovery is deferred in this version.

## Start the application

From the repository root:

```sh
pnpm dev
```

Open the local application and sign in with a valid Redmine API key.

## Validate the issue list

1. Open the issue list without configuring preferences. Confirm page 1 contains at most 10 issues and the list reports the matching total when available.
2. Change the page size to 25. Confirm the list updates, page navigation appears when there are more results, and the preference remains after reloading the list.
3. Move to a later page. Confirm the displayed issue IDs do not repeat the previous page and the page indicator reflects the current result position.
4. Add two or more supported filters. Confirm every displayed issue satisfies all active criteria and the result count reflects the filtered set.
5. Change a filter while on a later page. Confirm the list returns to a valid page and retains the new criteria.
6. Save the criteria with a name, reload, and apply the saved filter. Confirm its criteria are restored. Rename, update, and delete it, confirming each action in the saved-filter list.
7. Select visible filter controls, reload, and confirm the selection is retained while other available controls can still be added.
8. Clear all filters. Confirm the unfiltered permission-visible list returns.
9. Try an invalid or no-longer-supported filter field/operator. Confirm the issue list reports the problem, retains the criteria for correction, and does not silently show broader results.
10. Sign in as a different Redmine user in the same browser profile. Confirm the first user's preferences are not loaded.
11. With an ordinary account, confirm the catalog offers standard filters without calling `/custom_fields.json`. Saved `cf_*` criteria must remain reviewable, application must be blocked, and a direct request must return 400 `custom_fields_unavailable` without fetching issues or broadening the search.
12. Revoke the local test API Key before loading the filter catalog. Confirm 401 ends the session; restore the key after the isolated check.

## Expected outcomes

- Filtering and paging are performed against Redmine's full permission-filtered result set.
- The default page size is 10; supported choices are 10, 25, 50, and 100.
- Page, filter, and saved-preference actions remain keyboard-operable and have visible labels and focus states.
- Network or Redmine errors are visible, preserve the active criteria, and allow retry.
- Browser storage contains only non-secret preferences, scoped to the Redmine instance and user.

Refer to [the issue-list contract](contracts/issues-list.md) and [the data model](data-model.md) for request and preference details.

## Implementation review

- The issue endpoint validates page, page size, fields, operators, and values before contacting Redmine. Redmine rejections return an error with active filters preserved for correction.
- Standard filters accept typed values where selectable metadata is unavailable; custom-field filters are unavailable in this version. Project custom fields remain supported for issue creation.
- Browser preferences are scoped by the configured Redmine base URL and Redmine user ID. The authenticated filter metadata endpoint supplies the base URL; API keys and session credentials are never stored in preferences.
- The documented scenarios were checked against the implemented request and UI flows. Simulated browser regressions pass on 2026-10-13, including standard-catalog revocation and preserved custom criteria. Local Redmine integration is documented separately; deployed-instance acceptance remains pending.
