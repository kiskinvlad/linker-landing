/**
 * Dev server only (`ng serve`). In production the edge routes `/editor/*` to the
 * editor's static build on the same origin (plan §2); this reproduces that
 * locally, so "Open editor" is the same full-page load to a same-origin path in
 * both, and the portal's `returnUrl` rules need no dev-only exception.
 *
 * The editor (linker-editor) must be running and serve under `/editor/`: its
 * `angular.json` sets `baseHref: "/editor/"`, which `ng serve` also serves at.
 * Point elsewhere with EDITOR_DEV_URL, e.g. `EDITOR_DEV_URL=http://localhost:4300`.
 */
const target = process.env.EDITOR_DEV_URL ?? 'http://localhost:4200';

export default {
  '/editor': { target, secure: false, changeOrigin: true },
  // The editor's live-reload socket (webpack dev server), which its page opens
  // against the origin it was loaded from — the portal's, through this proxy.
  '/ng-cli-ws': { target, secure: false, ws: true, changeOrigin: true },
};
