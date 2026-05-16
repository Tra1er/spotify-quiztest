"use client";

import { useMemo, useState } from "react";
import type { QuizRound } from "@/lib/quiz";
import { AudioPlayer } from "./AudioPlayer";

type Props = {
  rounds: QuizRound[];
  playlistName: string;
  onExit: () => void;
};

export function QuizGame({ rounds, playlistName, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const round = rounds[index];
  const finished = index >= rounds.length;

  const summary = useMemo(
    () => ({
      total: rounds.length,
      percent: Math.round((score / rounds.length) * 100),
    }),
    [score, rounds.length],
  );

  function pick(choiceId: string) {
    if (revealed) return;
    setSelected(choiceId);
    setRevealed(true);
    const correct = choiceId === round.correctId;
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  }

  function nextRound() {
    setSelected(null);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-lg text-center space-y-8 py-8">
        <p className="text-sm uppercase tracking-widest text-spotify">Game over</p>
        <h2 className="font-display text-4xl font-bold">
          {score} / {summary.total}
        </h2>
        <p className="text-muted text-lg">{summary.percent}% correct</p>
        <p className="text-sm text-muted">
          Best streak: {bestStreak} · Playlist: {playlistName}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onExit}
            className="rounded-full bg-spotify px-8 py-3 font-semibold text-black"
          >
            Play again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            {playlistName}
          </p>
          <h2 className="font-display text-xl font-semibold">
            Round {index + 1} of {rounds.length}
          </h2>
        </div>
        <div className="flex gap-4 text-sm">
          <Stat label="Score" value={`${score}`} />
          <Stat label="Streak" value={`${streak}🔥`} />
        </div>
      </header>

      <div className="glass rounded-3xl p-8 text-center space-y-6">
        <p className="text-muted">Which song is playing?</p>
        <AudioPlayer
          key={`${round.previewUrl}-${round.sampleStartSec}`}
          previewUrl={round.previewUrl}
          startSec={round.sampleStartSec}
          lengthSec={round.sampleLengthSec}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {round.choices.map((choice) => {
          const isSelected = selected === choice.id;
          const isCorrect = choice.id === round.correctId;
          let style =
            "glass w-full rounded-2xl p-4 text-left transition hover:border-spotify/40";

          if (revealed) {
            if (isCorrect) style += " border-spotify bg-spotify/15";
            else if (isSelected) style += " border-red-500/60 bg-red-500/10";
            else style += " opacity-50";
          } else if (isSelected) {
            style += " border-spotify/60";
          }

          return (
            <button
              key={choice.id}
              type="button"
              disabled={revealed}
              onClick={() => pick(choice.id)}
              className={style}
            >
              <div className="flex items-center gap-3">
                {choice.albumArt && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={choice.albumArt}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-medium leading-tight">{choice.label}</p>
                  <p className="text-sm text-muted">{choice.artist}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={nextRound}
            className="rounded-full bg-white px-8 py-3 font-semibold text-black"
          >
            {index + 1 >= rounds.length ? "See results" : "Next round"}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-muted text-xs">{label}</p>
      <p className="font-display font-semibold">{value}</p>
    </div>
  );
}
