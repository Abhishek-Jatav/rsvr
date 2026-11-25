/**
 * Remembers which email the user is signing in with between the login, code and passkey screens.
 * An email address is not a secret; OTP codes and session tokens are never stored in the browser.
 */
const KEY = 'rsvr_pending_email';

export function setPendingEmail(email) {
  try { window.sessionStorage.setItem(KEY, email); } catch { /* storage unavailable: user re-enters email */ }
}
export function getPendingEmail() {
  try { return window.sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function clearPendingEmail() {
  try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
