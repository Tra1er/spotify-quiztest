const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

/** Prefer the live request origin so preview URLs work on Vercel. */
export function getRedirectUri(origin?: string): string {
  if (origin) {
    return `${origin.replace(/\/$/, "")}/api/auth/callback`;
  }
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
  country?: string;
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  images?: { url: string }[];
  tracks?: { total: number };
  owner?: { display_name?: string | null; id?: string };
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

type RawTrack = {
  id: string;
  name: string;
  preview_url: string | null;
  duration_ms?: number;
  is_local?: boolean;
  artists?: { name: string }[];
  album?: { name: string; images?: { url: string }[] };
  linked_from?: { preview_url?: string | null };
};

type Paged<T> = {
  items: T[];
  next: string | null;
};

type PlaylistIdItem = {
  track?: { id: string } | null;
  item?: { id: string } | null;
};

export function buildAuthUrl(state: string, redirectUri?: string): string {
  const uri = redirectUri ?? getRedirectUri();
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: uri,
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "false",
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params}`;
}

export async function exchangeCode(
  code: string,
  redirectUri?: string,
): Promise<SpotifyTokens> {
  const uri = redirectUri ?? getRedirectUri();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: uri,
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
  let path: string | null =
    "/me/playlists?limit=50&fields=items(id,name,images,tracks(total),owner(display_name,id)),next";

  while (path) {
    const page: Paged<SpotifyPlaylist> = await spotifyFetch<Paged<SpotifyPlaylist>>(
      path,
      accessToken,
    );
    playlists.push(...page.items);
    path = page.next;
  }

  return playlists;
}

function previewUrlFromRaw(raw: RawTrack): string | null {
  if (raw.preview_url) return raw.preview_url;
  if (raw.linked_from?.preview_url) return raw.linked_from.preview_url;
  return null;
}

function normalizeTrack(raw: RawTrack | null): SpotifyTrack | null {
  if (!raw?.id || raw.is_local) return null;
  const preview_url = previewUrlFromRaw(raw);
  return {
    id: raw.id,
    name: raw.name,
    artists: raw.artists ?? [],
    album: {
      name: raw.album?.name ?? "",
      images: raw.album?.images ?? [],
    },
    preview_url,
    duration_ms: raw.duration_ms ?? 0,
  };
}

export type PlaylistTracksResult = {
  withPreview: SpotifyTrack[];
  totalTracks: number;
};

function parseMarket(country?: string): string | undefined {
  if (country && /^[A-Z]{2}$/i.test(country)) {
    return country.toUpperCase();
  }
  return undefined;
}

function idFromPlaylistItem(item: PlaylistIdItem): string | null {
  return item.track?.id ?? item.item?.id ?? null;
}

type PlaylistItemsBundle = {
  items: {
    items: PlaylistIdItem[];
    next: string | null;
  };
};

/** Collect track IDs — try several endpoints (dev-mode apps often block /tracks sub-route). */
async function collectPlaylistTrackIds(
  accessToken: string,
  playlistId: string,
): Promise<string[]> {
  const ids: string[] = [];
  const errors: string[] = [];

  const pushPage = (rows: PlaylistIdItem[]) => {
    for (const row of rows) {
      const id = idFromPlaylistItem(row);
      if (id) ids.push(id);
    }
  };

  // A) GET /playlists/{id} — recommended for playlists you own
  try {
    const fields = encodeURIComponent(
      "items(items(track(id),item(id))),items(next)",
    );
    let path: string | null = `/playlists/${playlistId}?fields=${fields}`;
    while (path) {
      const page = await spotifyFetch<PlaylistItemsBundle>(path, accessToken);
      pushPage(page.items.items);
      path = page.items.next;
    }
    if (ids.length > 0) return [...new Set(ids)];
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "get-playlist");
  }

  // B) GET /playlists/{id}/tracks — no extra params (user token supplies country)
  try {
    let path: string | null = `/playlists/${playlistId}/tracks?limit=100`;
    while (path) {
      const page = await spotifyFetch<Paged<PlaylistIdItem>>(path, accessToken);
      pushPage(page.items);
      path = page.next;
    }
    if (ids.length > 0) return [...new Set(ids)];
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "get-playlist-tracks");
  }

  // C) GET /playlists/{id}/items
  try {
    let path: string | null = `/playlists/${playlistId}/items?limit=100`;
    while (path) {
      const page = await spotifyFetch<Paged<PlaylistIdItem>>(path, accessToken);
      pushPage(page.items);
      path = page.next;
    }
    if (ids.length > 0) return [...new Set(ids)];
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "get-playlist-items");
  }

  throw new Error(errors.join(" | ") || "Could not read playlist");
}

/**
 * GET /tracks?ids=... — official way to read preview_url (see Spotify docs).
 * With a user token, omitting market uses the user's account country.
 */
async function fetchTracksByIds(
  accessToken: string,
  ids: string[],
  market?: string,
): Promise<Map<string, SpotifyTrack>> {
  const map = new Map<string, SpotifyTrack>();
  if (ids.length === 0) return map;

  const marketQuery = market ? `&market=${encodeURIComponent(market)}` : "";

  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await spotifyFetch<{ tracks: (RawTrack | null)[] }>(
      `/tracks?ids=${chunk.join(",")}${marketQuery}`,
      accessToken,
    );

    for (const raw of data.tracks) {
      const track = normalizeTrack(raw);
      if (track) map.set(track.id, track);
    }
  }

  return map;
}

function mergePreviewTracks(
  maps: Map<string, SpotifyTrack>[],
): SpotifyTrack[] {
  const byId = new Map<string, SpotifyTrack>();
  for (const map of maps) {
    for (const [id, track] of map) {
      const existing = byId.get(id);
      if (!existing?.preview_url && track.preview_url) {
        byId.set(id, track);
      } else if (!existing) {
        byId.set(id, track);
      }
    }
  }
  return [...byId.values()].filter((t) => Boolean(t.preview_url));
}

export async function getPlaylistTracks(
  accessToken: string,
  playlistId: string,
  market?: string,
): Promise<PlaylistTracksResult> {
  const userMarket = parseMarket(market);
  const trackIds = await collectPlaylistTrackIds(accessToken, playlistId);
  const totalTracks = trackIds.length;

  if (totalTracks === 0) {
    return { withPreview: [], totalTracks: 0 };
  }

  const maps: Map<string, SpotifyTrack>[] = [];

  // User access token → account country (no market param)
  maps.push(await fetchTracksByIds(accessToken, trackIds));

  if (userMarket) {
    maps.push(await fetchTracksByIds(accessToken, trackIds, userMarket));
  }

  let withPreview = mergePreviewTracks(maps);

  if (withPreview.length < 4) {
    let missing = trackIds.filter(
      (id) => !withPreview.some((t) => t.id === id),
    );

    for (const fallback of ["PL", "US", "GB", "DE", "FR", "NL", "SE"]) {
      if (fallback === userMarket || missing.length === 0) continue;
      maps.push(await fetchTracksByIds(accessToken, missing, fallback));
      withPreview = mergePreviewTracks(maps);
      if (withPreview.length >= 4) break;
      missing = trackIds.filter(
        (id) => !withPreview.some((t) => t.id === id),
      );
    }
  }

  return { withPreview, totalTracks };
}
