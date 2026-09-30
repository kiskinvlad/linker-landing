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
 * Where a validated returnUrl points. The editor is a separate app served
 * same-origin at /editor/ (plan D2), so reaching it is a full page load, not a
 * router navigation.
 */
export function isEditorUrl(url: string, editorPath: string): boolean {
  return url === editorPath.replace(/\/$/, '') || url.startsWith(editorPath);
}
