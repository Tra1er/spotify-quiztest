import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/spotify";
import {
  consumeOAuthState,
  createSessionFromTokens,
} from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const base = request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(
      `${base}/?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !(await consumeOAuthState(state))) {
    return NextResponse.redirect(`${base}/?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCode(code);
    await createSessionFromTokens(tokens);
    return NextResponse.redirect(`${base}/play`);
  } catch {
    return NextResponse.redirect(`${base}/?error=auth_failed`);
  }
}
