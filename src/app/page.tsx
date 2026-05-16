import { SpotifyLoginButton } from "@/components/SpotifyLoginButton";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the Spotify login.",
  invalid_state: "Login expired — please try again.",
  auth_failed: "Could not connect to Spotify. Check your app settings.",
};

export default async function HomePage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl text-center space-y-10">
        <div className="space-y-4">
          <p className="inline-block rounded-full border border-spotify/30 bg-spotify/10 px-4 py-1 text-xs font-medium uppercase tracking-widest text-spotify">
            Spotify Music Quiz
          </p>
          <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl">
            Guess the song
            <span className="block text-spotify">from your playlists</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted">
            Log in with Spotify, pick any playlist, hear a short preview, and
            choose the right track from four options.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
          </p>
        )}

        <SpotifyLoginButton />

        <ul className="mx-auto grid max-w-md gap-3 text-left text-sm text-muted sm:grid-cols-2">
          <Feature>Pick any of your playlists</Feature>
          <Feature>Adjust sample length (3–20s)</Feature>
          <Feature>Random, start, or middle clip</Feature>
          <Feature>Score, streaks & round count</Feature>
        </ul>

        <p className="text-xs text-muted/80">
          Uses Spotify&apos;s 30-second track previews. Not all songs have
          previews — pick playlists with mainstream tracks for best results.
        </p>
      </div>
    </main>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-spotify">♪</span>
      {children}
    </li>
  );
}
