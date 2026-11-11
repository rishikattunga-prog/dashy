/**
 * POST /api/snapshot
 * Body: { events, assignments, tasks }  (whatever the page currently has)
 * Calls Claude to write a short, grounded day briefing + a priority nudge.
 * The key stays here on the server. Falls back to a deterministic summary if
 * the API is unreachable, so the card never shows an error.
 */

import { readJson } from "./_lib.js";

const SYSTEM = `You are the assistant inside a Purdue student's morning dashboard. Write a warm briefing of 3-4 sentences from ONLY the data given. Never invent an event, deadline or task. Name the first commitment, the most urgent thing to start, and anything exam-related, and end with one realistic priority. Plain prose, no lists, no greeting header, no markdown.`;

function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Indiana/Indianapolis" }); }
  catch { return ""; }
}

export default async function handler(req, res) {
  const { events = [], assignments = [], tasks = [] } = await readJson(req);

  const payload = {
    events: events.map((e) => ({ title: e.t || e.title, start: fmtTime(e.s || e.start), where: e.m || e.location })),
    assignments: assignments.map((a) => ({ title: a.t || a.title, due: a.due, exam: !!a.exam })),
    tasks: tasks.filter((t) => !t.done).map((t) => ({ title: t.title, due: t.due })),
  };

  const fallback = buildFallback(payload);

  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ text: fallback });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: "Data:\n" + JSON.stringify(payload) }],
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join(" ").trim();
    res.status(200).json({ text: text || fallback });
  } catch (e) {
    console.error("[snapshot]", e);
    res.status(200).json({ text: fallback });
  }
}

function buildFallback(p) {
  const parts = [];
  if (p.events[0]) parts.push(`Your first commitment is ${p.events[0].title} at ${p.events[0].start}.`);
  const exam = p.assignments.find((a) => a.exam);
  if (exam) parts.push(`${exam.title} is coming up — block study time.`);
  const firstTask = p.tasks[0];
  if (firstTask) parts.push(`Start with ${firstTask.title}.`);
  if (!parts.length) return "A clear day — add a task or event to get a briefing.";
  return parts.join(" ");
}
