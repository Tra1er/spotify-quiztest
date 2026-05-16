"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_SETTINGS, type QuizRound, type QuizSettings } from "@/lib/quiz";
import { QuizSettingsPanel } from "@/components/QuizSettings";
import { QuizGame } from "@/components/QuizGame";

type Playlist = {
  id: string;
  name: string;
  image: string | null;
  trackCount: number;
  owner: string;
};

type User = {
  id: string;
  display_name: string | null;
  images?: { url: string }[];
};

export default function PlayPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  const [starting, setStarting] = useState(false);
  const [game, setGame] = useState<{
    rounds: QuizRound[];
    playlistName: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/me");
        if (!meRes.ok) {
          router.replace("/");
          return;
        }
        const { user: u } = await meRes.json();
        setUser(u);

        const plRes = await fetch("/api/playlists");
        if (!plRes.ok) throw new Error("Failed to load playlists");
        const { playlists: list } = await plRes.json();
        setPlaylists(list);
      } catch {
        setError("Could not load your Spotify data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }, [router]);

  const startQuiz = useCallback(async () => {
    if (!selected) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlist/${selected.id}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start quiz");
      setGame({ rounds: data.rounds, playlistName: selected.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start quiz");
    } finally {
      setStarting(false);
    }
  }, [selected, settings]);

  const filtered = playlists.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (game) {
    return (
      <Shell user={user} onLogout={logout}>
        <QuizGame
          rounds={game.rounds}
          playlistName={game.playlistName}
          onExit={() => setGame(null)}
        />
      </Shell>
    );
  }

  return (
    <Shell user={user} onLogout={logout}>
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <h1 className="font-display text-3xl font-bold">Choose a playlist</h1>
          <p className="text-muted mt-1">
            Hi {user?.display_name ?? "there"} — pick a playlist to quiz yourself on.
          </p>
        </header>

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <input
              type="search"
              placeholder="Search playlists…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-spotify/50"
            />

            {loading ? (
              <p className="text-muted py-12 text-center">Loading playlists…</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted py-12 text-center">No playlists found.</p>
            ) : (
              <ul className="grid gap-2 max-h-[420px] overflow-y-auto pr-1">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected?.id === p.id
                          ? "border-spotify bg-spotify/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt=""
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10 text-lg">
                          ♪
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted">
                          {p.trackCount} tracks · {p.owner}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            <QuizSettingsPanel settings={settings} onChange={setSettings} />
            <button
              type="button"
              disabled={!selected || starting}
              onClick={() => void startQuiz()}
              className="w-full rounded-full bg-spotify py-4 font-display font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {starting ? "Building quiz…" : "Start quiz"}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  user,
  onLogout,
}: {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-screen px-6 py-8">
      <nav className="mx-auto mb-10 flex max-w-4xl items-center justify-between">
        <a href="/" className="font-display text-lg font-bold">
          Playlist<span className="text-spotify">Guess</span>
        </a>
        <div className="flex items-center gap-4">
          {user?.images?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.images[0].url}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          )}
          <button
            type="button"
            onClick={onLogout}
            className="text-sm text-muted hover:text-white"
          >
            Log out
          </button>
        </div>
      </nav>
      {children}
    </main>
  );
}
