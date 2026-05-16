import { cookies } from "next/headers";
import crypto from "crypto";
import {
  getCurrentUser,
  refreshAccessToken,
  type SpotifyTokens,
  type SpotifyUser,
} from "./spotify";

const COOKIE_NAME = "spotify_quiz_session";
const STATE_COOKIE = "spotify_quiz_oauth_state";

export type SessionData = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SpotifyUser;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function encodeSession(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function decodeSession(token: string): SessionData | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (sign(payload) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function setSessionCookie(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = decodeSession(token);
  if (!session) return null;

  if (Date.now() < session.expiresAt - 60_000) {
    return session;
  }

  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    const refreshed: SessionData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      user: session.user,
    };
    await setSessionCookie(refreshed);
    return refreshed;
  } catch {
    await clearSessionCookie();
    return null;
  }
}

export async function createSessionFromTokens(
  tokens: SpotifyTokens,
): Promise<SessionData> {
  const user = await getCurrentUser(tokens.access_token);
  const session: SessionData = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    user,
  };
  await setSessionCookie(session);
  return session;
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function setOAuthState(state: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function consumeOAuthState(
  incoming: string | null,
): Promise<boolean> {
  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  return Boolean(expected && incoming && expected === incoming);
}
