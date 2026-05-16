import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/spotify";
import { generateOAuthState, setOAuthState } from "@/lib/session";

export async function GET() {
  const state = generateOAuthState();
  await setOAuthState(state);
  return NextResponse.redirect(buildAuthUrl(state));
}
