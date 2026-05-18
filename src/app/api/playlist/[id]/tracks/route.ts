import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlaylistTracks } from "@/lib/spotify";
import { buildRounds, DEFAULT_SETTINGS, type QuizSettings } from "@/lib/quiz";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let settings: QuizSettings = DEFAULT_SETTINGS;

  try {
    const body = await request.json();
    if (body?.settings) {
      settings = {
        ...DEFAULT_SETTINGS,
        ...body.settings,
        choicesCount: 4,
        sampleLengthSec: Math.min(
          30,
          Math.max(3, Number(body.settings.sampleLengthSec) || 8),
        ),
        rounds: Math.min(
          50,
          Math.max(3, Number(body.settings.rounds) || 10),
        ),
      };
    }
  } catch {
    /* use defaults */
  }

  try {
    const { withPreview, totalTracks } = await getPlaylistTracks(
      session.accessToken,
      id,
      session.user.country,
    );

    if (withPreview.length < 4) {
      return NextResponse.json(
        {
          error:
            totalTracks === 0
              ? "This playlist has no playable tracks."
              : `Found ${totalTracks} tracks, but only ${withPreview.length} have 30-second previews (need at least 4). Try "Discover Weekly", "Liked Songs", or a mainstream playlist.`,
        },
        { status: 400 },
      );
    }

    const rounds = buildRounds(withPreview, settings);
    return NextResponse.json({
      rounds,
      meta: {
        totalWithPreview: withPreview.length,
        totalTracks,
        roundsPlayed: rounds.length,
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load playlist tracks";
    console.error("playlist tracks error:", message);
    if (message.includes("403")) {
      return NextResponse.json(
        {
          error:
            "Spotify blocked access to this playlist (403). Log out, log in again, and try a playlist you own (e.g. Discover Weekly). If it persists, add your Spotify email under Developer Dashboard → User Management.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
