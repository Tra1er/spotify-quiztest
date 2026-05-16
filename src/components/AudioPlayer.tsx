"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  previewUrl: string;
  startSec: number;
  lengthSec: number;
  autoPlay?: boolean;
  onEnded?: () => void;
};

export function AudioPlayer({
  previewUrl,
  startSec,
  lengthSec,
  autoPlay = true,
  onEnded,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (audio) {
      audio.pause();
    }
    setPlaying(false);
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    stop();
    audio.currentTime = startSec;
    try {
      await audio.play();
      setPlaying(true);

      const tick = () => {
        const elapsed = audio.currentTime - startSec;
        setProgress(Math.min(1, Math.max(0, elapsed / lengthSec)));
      };
      audio.ontimeupdate = tick;

      stopTimerRef.current = setTimeout(() => {
        stop();
        onEnded?.();
      }, lengthSec * 1000);
    } catch {
      setPlaying(false);
    }
  }, [startSec, lengthSec, stop, onEnded]);

  useEffect(() => {
    setProgress(0);
    if (autoPlay) {
      void play();
    }
    return stop;
  }, [previewUrl, startSec, lengthSec, autoPlay, play, stop]);

  return (
    <div className="flex flex-col items-center gap-4">
      <audio ref={audioRef} src={previewUrl} preload="auto" />

      <button
        type="button"
        onClick={() => (playing ? stop() : void play())}
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-spotify text-black shadow-lg shadow-spotify/30 transition hover:scale-105"
        aria-label={playing ? "Pause sample" : "Play sample"}
      >
        {playing && (
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-spotify/40" />
        )}
        {playing ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </button>

      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-spotify transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <p className="text-xs text-muted">
        {lengthSec}s clip · starts at {startSec.toFixed(1)}s
      </p>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="ml-1 h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
