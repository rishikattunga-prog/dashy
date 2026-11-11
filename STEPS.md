# Ship the live dashboard — step by step

Everything that connects Google Calendar, weather, news, and the AI snapshot, in order. About
30 minutes, most of it in the Google console. No database, no framework — a static page plus small
serverless functions on Vercel.

You'll reuse the Google project and Anthropic key you already made.

---

## What's in the folder

```
live/
├── index.html          the whole dashboard (tasks + focus work offline; the rest goes live)
├── api/
│   ├── _lib.js                 shared helpers (cookie crypto, Google OAuth)
│   ├── auth-google.js          start sign-in
│   ├── auth-google-callback.js finish sign-in, store token in an encrypted cookie
│   ├── auth-logout.js          disconnect
│   ├── calendar.js             today's events + this week's assignments
│   ├── weather.js              Open-Meteo (no key)
│   ├── news.js                 Google News (no key)
│   └── snapshot.js             the Claude day briefing
├── package.json
├── vercel.json
└── .env.example
```

---

## Step 1 — Put it on GitHub (5 min)

1. New GitHub repo, private is fine. Name it `morning-dashboard`.
2. Put the whole `live/` folder's contents at the repo root (so `index.html` and `api/` sit at the
   top level).
3. Push.

```bash
cd live
git init && git add -A && git commit -m "Live dashboard"
git branch -M main
git remote add origin https://github.com/YOU/morning-dashboard.git
git push -u origin main
```

## Step 2 — Deploy to Vercel (5 min)

1. vercel.com → Add New → Project → import the repo → **Deploy**.
2. It builds in a few seconds (nothing to configure — Vercel sees `index.html` and the `api/` folder).
3. Note your URL, e.g. `https://morning-dashboard-xyz.vercel.app`. You'll need it twice below.

At this point the site loads and **tasks + focus already work**. Calendar/weather/news/AI are still
sample until the keys are in.

## Step 3 — Generate the session secret (1 min)

This encrypts your Google token in the cookie.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output.

## Step 4 — Google OAuth (10 min)

You already have a Google project from before — reuse it.

1. console.cloud.google.com → your project → **APIs & Services → Library** → make sure
   **Google Calendar API** is enabled.
2. **APIs & Services → Credentials** → open your existing **OAuth client ID** (Web application), or
   create one.
3. Under **Authorised redirect URIs**, add:
   ```
   https://YOUR-APP.vercel.app/api/auth-google-callback
   http://localhost:3000/api/auth-google-callback
   ```
4. Copy the **Client ID** and **Client secret**.
5. **OAuth consent screen** → make sure you're listed under **Test users** (your own Gmail). The app
   can stay in Testing mode — that's fine for personal use.

The app only asks for `calendar.readonly` — it reads your calendar and never changes it.

## Step 5 — Add the environment variables (5 min)

Vercel → your project → **Settings → Environment Variables**. Add these six:

| Name | Value |
|---|---|
| `APP_URL` | `https://YOUR-APP.vercel.app` |
| `SESSION_SECRET` | the base64 string from Step 3 |
| `GOOGLE_CLIENT_ID` | from Step 4 |
| `GOOGLE_CLIENT_SECRET` | from Step 4 |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-APP.vercel.app/api/auth-google-callback` |
| `ANTHROPIC_API_KEY` | your Claude key |

Then **Deployments → ⋯ → Redeploy** so the new variables take effect.

## Step 6 — Turn it on (2 min)

1. Open your Vercel URL.
2. Click **Connect Google** (top right) → pick your account → accept the "unverified app" warning
   (it's your own app) → you land back connected, and your real calendar fills in.
3. Allow location when the browser asks — that's the live weather. (Decline and it defaults to West
   Lafayette.)
4. The headlines and the AI snapshot fill in on their own.

Done. That's the whole thing live.

---

## How to get the best out of it

- **Put your assignments and exam dates in Google Calendar.** All-day events, and anything with
  "due", "exam", "lab report", "problem set", "deliverable" in the title, show up under **Due soon**;
  "exam/midterm/final/quiz" get the study nudge.
- **Area colors** are auto-detected from event titles (180DC, CASO, RA, research, else class). Name
  events the way you think of them and they'll color correctly.
- **Meeting links** — events with a Google Meet link get a **Join** button automatically.

## If something's off

| Symptom | Fix |
|---|---|
| `redirect_uri_mismatch` | The URI in Google must match `GOOGLE_REDIRECT_URI` exactly — https, no trailing slash |
| Connects, then calendar is empty | You have no events today/this week, or they're on a non-primary calendar (this reads your primary) |
| Works, then stops after an hour | Rare — means no refresh token was issued. Remove the app at myaccount.google.com/permissions and reconnect |
| Weather always West Lafayette | You declined the location prompt; re-allow it in the browser's site settings |
| AI snapshot is generic | `ANTHROPIC_API_KEY` is missing or wrong — it falls back to a simple summary |
| Env change did nothing | Redeploy after changing Vercel env vars |

## Privacy

Your Google token is encrypted (AES-256-GCM) and stored only in a cookie on your device — there's no
database. The calendar read is `readonly`. The AI snapshot sends only event titles/times, assignment
titles, and task titles to Claude — never your full calendar. Disconnect any time from the button,
and remove the grant entirely at myaccount.google.com/permissions.
