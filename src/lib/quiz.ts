import type { SpotifyTrack } from "./spotify";

export type QuizSettings = {
  sampleLengthSec: number;
  sampleStartMode: "random" | "beginning" | "middle";
  rounds: number;
  choicesCount: number;
};

export const DEFAULT_SETTINGS: QuizSettings = {
  sampleLengthSec: 8,
  sampleStartMode: "random",
  rounds: 10,
  choicesCount: 4,
};

export type QuizChoice = {
  id: string;
  label: string;
  artist: string;
  albumArt: string | null;
};

export type QuizRound = {
  correctId: string;
  choices: QuizChoice[];
  previewUrl: string;
  sampleStartSec: number;
  sampleLengthSec: number;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function trackLabel(track: SpotifyTrack): string {
  return track.name;
}

function pickSampleStart(
  previewMaxSec: number,
  sampleLengthSec: number,
  mode: QuizSettings["sampleStartMode"],
): number {
  const maxStart = Math.max(0, previewMaxSec - sampleLengthSec);
  if (maxStart <= 0) return 0;
  if (mode === "beginning") return 0;
  if (mode === "middle") return maxStart / 2;
  return Math.random() * maxStart;
}

export function buildRounds(
  tracks: SpotifyTrack[],
  settings: QuizSettings,
): QuizRound[] {
  const pool = shuffle(tracks);
  const count = Math.min(settings.rounds, pool.length);
  const rounds: QuizRound[] = [];
  const previewMaxSec = 30;

  for (let i = 0; i < count; i++) {
    const correct = pool[i];
    const others = shuffle(
      pool.filter((t) => t.id !== correct.id),
    ).slice(0, settings.choicesCount - 1);

    const roundTracks = shuffle([correct, ...others]);
    const sampleLengthSec = Math.min(
      settings.sampleLengthSec,
      previewMaxSec,
    );

    rounds.push({
      correctId: correct.id,
      previewUrl: correct.preview_url!,
      sampleStartSec: pickSampleStart(
        previewMaxSec,
        sampleLengthSec,
        settings.sampleStartMode,
      ),
      sampleLengthSec,
      choices: roundTracks.map((t) => ({
        id: t.id,
        label: trackLabel(t),
        artist: t.artists.map((a) => a.name).join(", "),
        albumArt: t.album.images[0]?.url ?? null,
      })),
    });
  }

  return rounds;
}
