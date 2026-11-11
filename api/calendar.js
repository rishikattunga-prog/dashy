/**
 * GET /api/calendar
 * Reads your Google Calendar and returns:
 *   - events: today's timed events (your schedule)
 *   - assignments: all-day items + due/exam-looking events over the next 7 days
 * Each is tagged with an area (class / 180dc / caso / ra / research) and, for
 * events, a Google Meet link when present.
 *
 * Returns 401 when not connected, so the page falls back to sample data.
 */

import { getSession, refreshAccess } from "./_lib.js";

const AREA_RULES = [
  [/180\s?dc|180 degrees|consult/i, "180dc"],
  [/\bcaso\b/i, "caso"],
  [/\bRA\b|resident|floor\s?event|hall\s?(meeting|event|program)/i, "ra"],
  [/research|anukriti|lab\s?meeting|speech|benchmark/i, "research"],
];
function areaOf(title) {
  for (const [re, a] of AREA_RULES) if (re.test(title)) return a;
  return "class";
}
const EXAM_RE = /\b(exam|midterm|final|quiz|test)\b/i;
const ASSIGN_RE = /\b(due|assignment|homework|hw|problem set|pset|lab report|deliverable|submit|report|paper|essay|project)\b/i;

function meetLink(e) {
  if (e.hangoutLink) return e.hangoutLink;
  const ep = e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video");
  if (ep) return ep.uri;
  const m = (e.description || "").match(/https:\/\/[^\s"<]*(zoom\.us|meet\.google|teams\.microsoft)[^\s"<]*/);
  return m ? m[0] : null;
}

async function gfetch(token, url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`google ${r.status}: ${await r.text()}`);
  return r.json();
}

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session?.refresh_token) return res.status(401).json({ error: "not_connected" });

  let token;
  try { token = await refreshAccess(session.refresh_token); }
  catch { return res.status(401).json({ error: "reauth" }); }

  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const endToday = new Date(start); endToday.setDate(endToday.getDate() + 1);
  const endWeek = new Date(start); endWeek.setDate(endWeek.getDate() + 7);

  const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const q = (min, max) => `${base}?${new URLSearchParams({ timeMin: min.toISOString(), timeMax: max.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "100" })}`;

  try {
    const [todayData, weekData] = await Promise.all([
      gfetch(token, q(start, endToday)),
      gfetch(token, q(now, endWeek)),
    ]);

    const events = (todayData.items || [])
      .filter((e) => e.status !== "cancelled" && e.start?.dateTime)
      .map((e) => ({
        id: e.id,
        t: e.summary || "(no title)",
        m: [e.location, meetLink(e) ? "Google Meet" : null].filter(Boolean).join(" · ") || "",
        s: e.start.dateTime,
        e: e.end.dateTime,
        area: areaOf(e.summary || ""),
        link: meetLink(e),
      }));

    // assignments: all-day events, or timed/all-day events that look like deadlines
    const assignments = (weekData.items || [])
      .filter((e) => e.status !== "cancelled")
      .filter((e) => !e.start?.dateTime || ASSIGN_RE.test(e.summary || "") || EXAM_RE.test(e.summary || ""))
      .map((e) => {
        const due = e.start?.dateTime || (e.start?.date ? e.start.date + "T23:00:00" : null);
        return {
          id: e.id,
          t: e.summary || "(no title)",
          due,
          area: areaOf(e.summary || ""),
          exam: EXAM_RE.test(e.summary || ""),
        };
      })
      .filter((a) => a.due)
      .sort((a, b) => new Date(a.due) - new Date(b.due))
      .slice(0, 8);

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ connected: true, email: session.email, events, assignments });
  } catch (e) {
    console.error("[calendar]", e);
    res.status(500).json({ error: "calendar_failed" });
  }
}
