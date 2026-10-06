import type { SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

import { getAppConfig } from "@/shared/config";

const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;

export interface AppSession {
  apiKey?: string;
  userId?: number;
  login?: string;
  expiresAt?: number;
}

export interface RedmineUser {
  id: number;
  login: string;
}

async function getSession() {
  const cookieStore = await cookies();
  const config = getAppConfig();
  const options: SessionOptions = {
    cookieName: "redmine-ui-session",
    password: config.ironSessionPassword,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };

  return getIronSession<AppSession>(cookieStore, options);
}

export async function getAuthenticatedSession() {
  const session = await getSession();
  if (
    !session.apiKey ||
    !session.userId ||
    !session.login ||
    !session.expiresAt ||
    Date.now() >= session.expiresAt
  ) {
    return null;
  }

  return session as typeof session & Required<AppSession>;
}

export async function getCurrentUser(): Promise<RedmineUser | null> {
  const session = await getAuthenticatedSession();
  return session ? { id: session.userId, login: session.login } : null;
}

export async function createSession(apiKey: string, user: RedmineUser) {
  const session = await getSession();
  session.apiKey = apiKey;
  session.userId = user.id;
  session.login = user.login;
  session.expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await session.save();
}

export async function clearSession() {
  const session = await getSession();
  session.destroy();
}
