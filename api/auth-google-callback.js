/**
 * GET /api/auth-google-callback
 * Verifies state, exchanges the code, and stores the refresh token in an
 * encrypted cookie. Then redirects home — you're connected.
 */

import { exchangeCode, decodeIdToken, setSession } from "./_lib.js";

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const home = process.env.APP_URL || "/";

  if (err) { res.writeHead(302, { Location: home + "?connect=denied" }); return res.end(); }

  const cookieState = (req.headers.cookie || "").split(";").map((s) => s.trim()).find((s) => s.startsWith("mmd_state="));
  const expected = cookieState ? cookieState.slice("mmd_state=".length) : null;
  if (!code || !state || state !== expected) {
    res.writeHead(302, { Location: home + "?connect=invalid" });
    return res.end();
  }

  try {
    const tokens = await exchangeCode(code);
    const profile = decodeIdToken(tokens.id_token);
    // Google returns a refresh token only on first consent; prompt=consent forces it.
    setSession(res, { refresh_token: tokens.refresh_token, email: profile.email, name: profile.name });
    // also clear the state cookie
    res.setHeader("Set-Cookie", [
      res.getHeader("Set-Cookie"),
      "mmd_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    ].flat());
    res.writeHead(302, { Location: home + "?connect=ok" });
    res.end();
  } catch (e) {
    console.error("[callback]", e);
    res.writeHead(302, { Location: home + "?connect=failed" });
    res.end();
  }
}
