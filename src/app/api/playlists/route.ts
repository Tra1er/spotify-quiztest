import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserPlaylists } from "@/lib/spotify";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlists = await getUserPlaylists(session.accessToken);
    const playable = playlists
      .filter((p) => p.tracks.total > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        image: p.images[0]?.url ?? null,
        trackCount: p.tracks.total,
        owner: p.owner.display_name,
      }));
    return NextResponse.json({ playlists: playable });
  } catch {
    return NextResponse.json(
      { error: "Failed to load playlists" },
      { status: 500 },
    );
  }
}
