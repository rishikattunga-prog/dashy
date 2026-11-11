/**
 * GET /api/auth-google
 * Starts the Google sign-in. A random state value is stored in a short cookie
 * and checked on the way back, so a forged callback can't connect an account.
 */

import crypto from "node:crypto";
import { googleAuthUrl } from "./_lib.js";

export default function handler(req, res) {
  const state = crypto.randomBytes(16).toString("base64url");
  res.setHeader("Set-Cookie", `mmd_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  res.writeHead(302, { Location: googleAuthUrl(state) });
  res.end();
}
