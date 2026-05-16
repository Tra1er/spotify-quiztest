const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export function getRedirectUri(): string {
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) {
    throw new Error(
      "Set SPOTIFY_REDIRECT_URI or NEXT_PUBLIC_APP_URL (or deploy to Vercel)",
    );
  }
  return `${base.replace(/\/$/, "")}/api/auth/callback`;
}

export function getClientId(): string {
  const id = process.env.SPOTIFY_CLIENT_ID;
  if (!id) throw new Error("SPOTIFY_CLIENT_ID is not set");
  return id;
}

export function getClientSecret(): string {
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!secret) throw new Error("SPOTIFY_CLIENT_SECRET is not set");
  return secret;
}

export type SpotifyTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export type SpotifyUser = {
  id: string;
  display_name: string | null;
  images?: { url: string }[];
  email?: string;
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
};

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  preview_url: string | null;
  duration_ms: number;
};

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "false",
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error("Failed to refresh token");
  }

  return res.json();
}

function apiPath(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http")) {
    const u = new URL(pathOrUrl);
    return u.pathname.replace(/^\/v1/, "") + u.search;
  }
  return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
}

async function spotifyFetch<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${SPOTIFY_API}${apiPath(path)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify API error: ${res.status} ${err}`);
  }

  return res.json();
}

export async function getCurrentUser(
  accessToken: string,
): Promise<SpotifyUser> {
  return spotifyFetch<SpotifyUser>("/me", accessToken);
}

export async function getUserPlaylists(
  accessToken: string,
): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = [];
  let url: string | null = "/me/playlists?limit=50";

  while (url) {
    const data = await spotifyFetch<{
      items: SpotifyPlaylist[];
      next: string | null;
    }>(url, accessToken);
    playlists.push(...data.items);
    url = data.next;
  }

  return playlists;
}

export async function getPlaylistTracks(
  accessToken: string,
  playlistId: string,
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let url: string | null = `/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,name,artists,album,duration_ms,preview_url)),next`;

  while (url) {
    const data = await spotifyFetch<{
      items: { track: SpotifyTrack | null }[];
      next: string | null;
    }>(url, accessToken);
    for (const item of data.items) {
      if (item.track?.id && item.track.preview_url) {
        tracks.push(item.track);
      }
    }
    url = data.next;
  }

  return tracks;
}
