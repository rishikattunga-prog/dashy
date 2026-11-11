# Detailed deploy guide — every click

Click-by-click, web-UI wherever possible, almost no terminal. Follow top to bottom. Each part ends
with a ✅ check — don't move on until it passes.

Have these files ready (the `live` folder): `index.html`, the `api` folder with its 8 files,
`package.json`, `vercel.json`. You do **not** need `.env.example`, `STEPS.md`, or this file in the
deploy — they're just for you.

---

# PART 1 — Accounts (5 min)

You need three free accounts. If you already have them, skip.

1. **GitHub** — github.com → Sign up.
2. **Vercel** — vercel.com → Sign up → choose **Continue with GitHub** (this links them).
3. You already have a **Google Cloud** project and an **Anthropic** key from before. Keep those tabs
   handy.

✅ **Check:** you can open github.com and vercel.com and you're logged into both.

---

# PART 2 — Put the files on GitHub (10 min, no terminal)

We'll upload through the website — no git commands.

1. Go to github.com → click the **+** (top-right) → **New repository**.
2. Repository name: `morning-dashboard`
3. Select **Private**.
4. Do **not** check "Add a README".
5. Click **Create repository**.
6. On the next page, click the link **uploading an existing file** (in the "…or upload an existing
   file" line).
7. Now drag files in. Important: the structure must end up like this in the repo:
   ```
   index.html
   package.json
   vercel.json
   api/            ← a folder
     _lib.js
     auth-google.js
     auth-google-callback.js
     auth-logout.js
     calendar.js
     weather.js
     news.js
     snapshot.js
   ```
   The easiest way: drag `index.html`, `package.json`, and `vercel.json` into the drop area, **and
   also drag the whole `api` folder** in. GitHub keeps the folder. (If dragging a folder doesn't
   work in your browser, create the files one group at a time — but folder drag usually works.)
8. Scroll down, leave the commit message as is, click **Commit changes**.

✅ **Check:** your repo page shows `index.html` and an `api` folder. Click into `api` — you should
see all 8 `.js` files. If `api` is missing or the files are loose at the top, delete and re-upload so
the folder is intact.

---

# PART 3 — Deploy to Vercel (5 min)

1. Go to vercel.com → **Add New…** → **Project**.
2. You'll see your GitHub repos. Find `morning-dashboard` → click **Import**.
3. Don't change any settings. Framework Preset will say "Other" — that's correct.
4. Click **Deploy**.
5. Wait ~30–60 seconds for the confetti.
6. Click the preview thumbnail (or **Continue to Dashboard** → **Visit**). You'll get a URL like
   `https://morning-dashboard-xyz123.vercel.app`.
7. **Copy that URL and paste it somewhere** — you need it three times below.

✅ **Check:** the URL opens the dashboard. You see the intro screen (clock, week, "Open today →").
Click in — **tasks and the focus timer already work**. Calendar, weather, news, and the snapshot
show sample data for now. That's expected.

---

# PART 4 — Make the session secret (2 min, no terminal)

This is a random key that encrypts your Google login. Easiest way without a terminal:

1. On your live dashboard page, press **F12** (or right-click → Inspect) to open DevTools.
2. Click the **Console** tab.
3. Paste this and press Enter:
   ```js
   btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(32))))
   ```
4. It prints a line like `"Qk9f...=="` (44 characters, ending in `=`). **Copy everything between the
   quotes** (not the quotes themselves).
5. Paste it somewhere safe for the next step.

(Terminal alternative, if you prefer:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

✅ **Check:** you have a 44-character string ending in `=`.

---

# PART 5 — Google setup (10 min)

This lets the app read your calendar. You're reusing your existing Google project.

### 5a. Enable the Calendar API

1. Go to console.cloud.google.com.
2. Top-left, make sure your existing project is selected (the dropdown next to "Google Cloud").
3. Left menu → **APIs & Services** → **Library**.
4. Search `Google Calendar API` → click it → **Enable** (if it already says "Manage", it's on —
   good).

### 5b. Add the redirect URL

1. Left menu → **APIs & Services** → **Credentials**.
2. Under **OAuth 2.0 Client IDs**, click your existing Web client (the one from before). If you don't
   have one: **Create Credentials** → **OAuth client ID** → Application type **Web application**.
3. Find **Authorised redirect URIs** → **+ Add URI**. Add this, using your real Vercel URL:
   ```
   https://YOUR-APP.vercel.app/api/auth-google-callback
   ```
   Replace `YOUR-APP.vercel.app` with your actual URL from Part 3. No trailing slash. It must be
   `https`.
4. Click **Save**.
5. Still on this page, copy the **Client ID** and **Client secret** (shown on the right, or click the
   client to see them).

### 5c. Make sure you're a test user

1. Left menu → **APIs & Services** → **OAuth consent screen**.
2. Scroll to **Test users** → if your Gmail isn't listed, **+ Add Users** → type your Gmail → **Save**.
3. Leave the app in "Testing" — you don't need to publish it.

✅ **Check:** Calendar API enabled, your Vercel callback URL saved under redirect URIs, and you have
the Client ID + secret copied.

---

# PART 6 — Add the keys to Vercel (5 min)

1. Go to vercel.com → your `morning-dashboard` project → **Settings** (top tab) → **Environment
   Variables** (left menu).
2. Add these **six**, one at a time. For each: type the **Name**, paste the **Value**, leave all
   three environment boxes checked, click **Save**.

   | Name | Value |
   |---|---|
   | `APP_URL` | your Vercel URL, e.g. `https://morning-dashboard-xyz123.vercel.app` |
   | `SESSION_SECRET` | the 44-char string from Part 4 |
   | `GOOGLE_CLIENT_ID` | from Part 5b (ends in `.apps.googleusercontent.com`) |
   | `GOOGLE_CLIENT_SECRET` | from Part 5b (starts with `GOCSPX-`) |
   | `GOOGLE_REDIRECT_URI` | `https://YOUR-APP.vercel.app/api/auth-google-callback` |
   | `ANTHROPIC_API_KEY` | your Claude key (starts with `sk-ant-`) |

   No quotes, no spaces before or after the values.

3. Now redeploy so they take effect: top tab **Deployments** → the most recent one → click the **⋯**
   on its right → **Redeploy** → confirm **Redeploy**.
4. Wait for it to finish (~30 sec).

✅ **Check:** six variables listed in Settings, and the redeploy shows "Ready".

---

# PART 7 — Turn it on (2 min)

1. Open your Vercel URL fresh (reload it).
2. Click **Open today →**, then the **Connect Google** button (top-right).
3. Google asks you to pick an account → choose yours.
4. You'll see **"Google hasn't verified this app"** → click **Advanced** → **Go to morning-dashboard
   (unsafe)**. This is your own app; the warning is normal for Testing mode.
5. It asks to see your calendar → **Continue**.
6. You land back on the dashboard, now showing **"Google connected"** and your real events.
7. Your browser asks to use your **location** → **Allow** (that's the live weather). If you decline,
   it just defaults to West Lafayette.
8. Headlines and the AI snapshot fill in on their own after a second or two.

✅ **Check:** your real calendar events are in **Today** and **Due soon**, the weather line matches
outside, and the snapshot reads like your actual day.

---

# PART 8 — Make it genuinely useful

- **Add your assignments and exam dates to Google Calendar.** The app pulls them automatically:
  - All-day events, and anything with "due", "exam", "lab report", "problem set", "deliverable",
    "submit" in the title → show under **Due soon**.
  - "exam", "midterm", "final", "quiz" → get the "block study time" nudge.
- **Name events the way you think of them** so the area colors land: titles with "180DC", "CASO",
  "RA"/"floor event", or "research"/"ANUKRITI" get the right color; everything else is "class".
- **Add this to your phone's home screen:** open the URL in Safari/Chrome on your phone → Share →
  **Add to Home Screen**. It opens like an app.

---

# Troubleshooting

| What you see | What to do |
|---|---|
| `Error 400: redirect_uri_mismatch` | The URL in Google (Part 5b) must exactly match `GOOGLE_REDIRECT_URI` in Vercel (Part 6) — `https`, your real domain, `/api/auth-google-callback`, no trailing slash |
| Connected, but Today is empty | You have no events today, or they're on a secondary calendar — this reads your **primary** Google calendar |
| "This app isn't verified" scared you off | It's your own app in Testing mode; Advanced → Go to… is safe |
| Weather stuck on West Lafayette | You declined location. Click the lock icon in the address bar → allow Location → reload |
| Snapshot sounds generic/robotic | `ANTHROPIC_API_KEY` is missing or wrong in Vercel; fix it and redeploy. (It falls back to a plain summary so it never breaks) |
| Changed a Vercel variable, nothing happened | You must **Redeploy** after changing env variables (Part 6 step 3) |
| 500 error on `/api/calendar` | Usually `SESSION_SECRET` isn't exactly 44 chars, or a Google value was pasted with a stray space |

When you hit something not in this table, tell me the exact error text and which Part you're on.

---

## After it's live

Everything you asked for is now real: calendar, assignments with exam nudges, the weekly strip, live
weather, world news, the AI snapshot, role colors, focus sessions, progress, join buttons, keyboard
and voice quick-add. The only things that live on your device (not the cloud) are your tasks and
focus history — by design, so there's no database to manage.
