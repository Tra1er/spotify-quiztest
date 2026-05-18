import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getRedirectUri } from "@/lib/spotify";
import {
  consumeOAuthState,
  createSessionFromTokens,
} from "@/lib/session";

function authErrorCode(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("redirect_uri") || lower.includes("redirect uri")) {
    return "redirect_mismatch";
  }
  if (lower.includes("invalid_client")) {
    return "invalid_client";
  }
  if (lower.includes("session_secret")) {
    return "session_config";
  }
  return "auth_failed";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const base = request.nextUrl.origin;
  const redirectUri = getRedirectUri(base);

  if (error) {
    return NextResponse.redirect(
      `${base}/?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !(await consumeOAuthState(state))) {
    return NextResponse.redirect(`${base}/?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCode(code, redirectUri);
    await createSessionFromTokens(tokens);
    return NextResponse.redirect(`${base}/play`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "auth_failed";
    const code = authErrorCode(message);
    return NextResponse.redirect(`${base}/?error=${code}`);
  }
}
