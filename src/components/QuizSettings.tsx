"use client";

import type { QuizSettings } from "@/lib/quiz";

type Props = {
  settings: QuizSettings;
  onChange: (settings: QuizSettings) => void;
};

export function QuizSettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <h3 className="font-display text-lg font-semibold">Quiz settings</h3>

      <label className="block space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Sample length</span>
          <span className="font-medium">{settings.sampleLengthSec}s</span>
        </div>
        <input
          type="range"
          min={3}
          max={20}
          value={settings.sampleLengthSec}
          onChange={(e) =>
            onChange({
              ...settings,
              sampleLengthSec: Number(e.target.value),
            })
          }
          className="w-full accent-spotify"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-muted">Where to start the clip</span>
        <select
          value={settings.sampleStartMode}
          onChange={(e) =>
            onChange({
              ...settings,
              sampleStartMode: e.target
                .value as QuizSettings["sampleStartMode"],
            })
          }
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-spotify/50"
        >
          <option value="random">Random position</option>
          <option value="beginning">From the start</option>
          <option value="middle">From the middle</option>
        </select>
      </label>

      <label className="block space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Number of rounds</span>
          <span className="font-medium">{settings.rounds}</span>
        </div>
        <input
          type="range"
          min={5}
          max={30}
          value={settings.rounds}
          onChange={(e) =>
            onChange({ ...settings, rounds: Number(e.target.value) })
          }
          className="w-full accent-spotify"
        />
      </label>
    </div>
  );
}
