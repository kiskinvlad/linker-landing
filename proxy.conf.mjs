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

/** What every dev server proxies, including the Ukrainian one (proxy.uk.conf.mjs). */
export const editorProxy = {
  '/editor': { target, secure: false, changeOrigin: true },
  // The editor's live-reload socket (webpack dev server), which its page opens
  // against the origin it was loaded from — the portal's, through this proxy.
  '/ng-cli-ws': { target, secure: false, ws: true, changeOrigin: true },
};

/**
 * `ng serve` builds one language. Production serves Ukrainian at `/ua/` from its own
 * build; this does the same with `pnpm start:ua`, which serves at `:4001/ua/`, so the
 * language switcher works on :4000 like it does live. Without it running, `/ua/`
 * answers with a proxy error, like `/editor/` without the editor.
 */
const ukTarget = process.env.UA_DEV_URL ?? 'http://localhost:4001';

export default {
  ...editorProxy,
  // Also carries the Ukrainian app's live-reload socket, which Vite opens under its
  // base path (/ua/) on the origin the page came from.
  '/ua': { target: ukTarget, secure: false, ws: true, changeOrigin: true },
};
