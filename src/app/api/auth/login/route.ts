import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl, getRedirectUri } from "@/lib/spotify";
import { generateOAuthState, setOAuthState } from "@/lib/session";

export async function GET(request: NextRequest) {
  const redirectUri = getRedirectUri(request.nextUrl.origin);
  const state = generateOAuthState();
  await setOAuthState(state);
  return NextResponse.redirect(buildAuthUrl(state, redirectUri));
}
