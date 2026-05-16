import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlaylistTracks } from "@/lib/spotify";
import { buildRounds, DEFAULT_SETTINGS, type QuizSettings } from "@/lib/quiz";

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
    const tracks = await getPlaylistTracks(session.accessToken, id);
    if (tracks.length < 4) {
      return NextResponse.json(
        {
          error:
            "Need at least 4 tracks with 30s previews in this playlist. Try another playlist or add more popular tracks.",
        },
        { status: 400 },
      );
    }

    const rounds = buildRounds(tracks, settings);
    return NextResponse.json({
      rounds,
      meta: {
        totalWithPreview: tracks.length,
        roundsPlayed: rounds.length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load playlist tracks" },
      { status: 500 },
    );
  }
}
