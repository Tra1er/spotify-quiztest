# Vercel build failing?

## 1. Redeploy the NEW commit (most common fix)

Your failed log shows:

`Commit: 854a796` — that is **before** the `src` folder was uploaded.

Latest commit on GitHub should be **`1c0e9a2f`** (or newer) with the `src` folder.

In Vercel:

1. **Deployments** tab
2. Open the latest deployment from GitHub (not "Redeploy" on the old failed one)
3. Or: **Deployments** → three dots on old build → **Redeploy** only if it says commit `1c0e9a2f` or later

Better: push a small change to GitHub (see below) so Vercel auto-builds the latest code.

## 2. Upload these fixed files to GitHub

If you use "Upload files", upload/replace:

- `next.config.ts` (updated)
- `postcss.config.mjs` (updated)
- `package.json` (updated — adds autoprefixer)

## 3. Vercel environment variables

Project → **Settings** → **Environment Variables** (not `.env.local` on GitHub):

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SESSION_SECRET`
- `SPOTIFY_REDIRECT_URI` = `https://YOUR-VERCEL-DOMAIN/api/auth/callback`

## 4. Delete `.env.local` from GitHub

It contains secrets and should not be in the repo.
