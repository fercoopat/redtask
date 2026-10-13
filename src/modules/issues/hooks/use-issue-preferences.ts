"use client";
import { type SetStateAction, useEffect, useState } from "react";

import {
  issuePreferencesKey,
  readIssuePreferences,
  writeIssuePreferences,
} from "@/modules/issues/helpers/issue-list-preferences";
import {
  type IssueListPreferences,
  preferencesSchema,
} from "@/modules/issues/schemas/issue-preferences";

export function useIssuePreferences(userId: number, instance: string, available: boolean) {
  const [state, setState] = useState({ key: "", preferences: preferencesSchema.parse({}) });
  const key = issuePreferencesKey(userId, instance);
  const ready = available && state.key === key;
  useEffect(() => {
    if (!available) return;
    const timer = window.setTimeout(
      () => setState({ key, preferences: readIssuePreferences(userId, instance) }),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [userId, instance, key, available]);
  useEffect(() => {
    if (ready) writeIssuePreferences(userId, instance, state.preferences);
  }, [ready, userId, instance, state.preferences]);
  const setPreferences = (update: SetStateAction<IssueListPreferences>) =>
    setState((current) => ({
      ...current,
      preferences: typeof update === "function" ? update(current.preferences) : update,
    }));
  return { preferences: state.preferences, setPreferences, ready };
}
