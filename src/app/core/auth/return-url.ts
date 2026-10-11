/**
 * `returnUrl` handling (plan §3): only same-origin relative paths are honoured, so a
 * crafted link like `/login?returnUrl=https://evil.example` can't turn the login
 * page into an open redirect.
 *
 * Accepted: a single leading `/` followed by anything but `/` or `\`.
 * Rejected: absolute URLs, protocol-relative `//host`, `/\host` (browsers treat
 * the backslash as a slash), schemes like `javascript:`, and anything with
 * control characters.
 */
export function safeReturnUrl(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return /^\/(?![/\\])/.test(raw) ? raw : fallback;
}

/**
 * Whether a validated returnUrl points into another app on this origin: the editor
 * at /editor/ (plan D2) or analytics at /analytics/. Reaching one is a full page
 * load, not a router navigation, and both need a verified address (plan D9).
 */
export function isAppUrl(url: string, appPaths: readonly string[]): boolean {
  return appPaths.some((path) => url === path.replace(/\/$/, '') || url.startsWith(path));
}
