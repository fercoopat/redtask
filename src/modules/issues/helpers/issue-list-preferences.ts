import {
  type IssueListPreferences,
  preferencesSchema,
} from "@/modules/issues/schemas/issue-preferences";
export type {
  IssueListPreferences,
  SavedIssueFilter,
} from "@/modules/issues/schemas/issue-preferences";

export function issuePreferencesKey(userId: number, redmineBaseUrl: string) {
  return `redmine-ui:issues:v1:${encodeURIComponent(redmineBaseUrl)}:${userId}`;
}
export function readIssuePreferences(userId: number, redmineBaseUrl: string): IssueListPreferences {
  try {
    return preferencesSchema.parse(
      JSON.parse(localStorage.getItem(issuePreferencesKey(userId, redmineBaseUrl)) ?? "{}"),
    );
  } catch {
    return preferencesSchema.parse({});
  }
}
export function writeIssuePreferences(
  userId: number,
  redmineBaseUrl: string,
  preferences: IssueListPreferences,
) {
  try {
    localStorage.setItem(issuePreferencesKey(userId, redmineBaseUrl), JSON.stringify(preferences));
  } catch {
    /* Storage can be disabled or full. */
  }
}
