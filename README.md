# Playlist Guess — Spotify Music Quiz

Guess songs from your Spotify playlists using 30-second preview clips.

## Spotify Dashboard setup

1. Open [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → your app → **Settings**.
2. Under **Redirect URIs**, add **exactly** (no trailing slash):

   ```
   https://YOUR-APP-NAME.vercel.app/api/auth/callback
   ```

   Replace `YOUR-APP-NAME` with your real Vercel project URL. If you use a custom domain:

   ```
   https://yourdomain.com/api/auth/callback
   ```

3. Click **Save**.

> **Note:** Spotify does not allow `http://localhost` for new apps. Deploy to Vercel first, then add the production URL above. For local dev you can use a tunnel (e.g. [ngrok](https://ngrok.com)) and add `https://xxxx.ngrok-free.app/api/auth/callback` as a second redirect URI.

## Deploy on Vercel

1. Push this folder to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Set **Environment variables**:

   | Variable | Value |
   |----------|--------|
   | `SPOTIFY_CLIENT_ID` | From Spotify Dashboard |
   | `SPOTIFY_CLIENT_SECRET` | From Spotify Dashboard |
   | `SPOTIFY_REDIRECT_URI` | `https://YOUR-APP-NAME.vercel.app/api/auth/callback` |
   | `SESSION_SECRET` | Random string (e.g. `openssl rand -base64 32`) |

4. Deploy. Copy your live URL and ensure it matches `SPOTIFY_REDIRECT_URI` in both Vercel and Spotify.

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local — use ngrok URL for SPOTIFY_REDIRECT_URI if needed
npm run dev
```

## How it works

- **Login:** OAuth 2.0 authorization code flow (server-side).
- **Playlists:** Fetches your playlists and tracks with `preview_url`.
- **Quiz:** Each round plays a configurable clip from one track; you pick the correct title from 4 choices.
- **Settings:** Sample length (3–20s), clip start (random / beginning / middle), number of rounds (5–30).

## Security

Never commit `.env.local` or expose `SPOTIFY_CLIENT_SECRET` in the browser. All Spotify API calls run on the server.
