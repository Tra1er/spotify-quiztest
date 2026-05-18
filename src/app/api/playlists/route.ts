import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserPlaylists } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlists = await getUserPlaylists(session.accessToken);
    const playable = playlists.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.url ?? null,
      trackCount: p.tracks?.total ?? null,
      owner: p.owner?.display_name ?? "Spotify",
    }));
    return NextResponse.json({ playlists: playable });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load playlists";
    console.error("playlists error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
