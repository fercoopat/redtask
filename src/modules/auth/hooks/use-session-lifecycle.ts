"use client";
import { createContext, useContext } from "react";

export const SessionLifecycleContext = createContext<(() => void) | null>(null);
export function useSessionLifecycle() {
  const endSession = useContext(SessionLifecycleContext);
  if (!endSession) throw new Error("An authenticated session provider is required.");
  return { endSession };
}
