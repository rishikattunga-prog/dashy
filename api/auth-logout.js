/**
 * POST /api/auth-logout
 * Clears the session cookie. (To fully revoke, remove the app at
 * myaccount.google.com/permissions.)
 */

import { clearSession } from "./_lib.js";

export default function handler(req, res) {
  clearSession(res);
  res.status(200).json({ ok: true });
}
