import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Marketing and legal routes are prerendered at build time; anything
 * session-dependent will be `RenderMode.Client`, since the session cookie is
 * host-only on the API origin and the build can't see it (plan §2).
 * `outputMode: "static"` means no Node server.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'pricing', renderMode: RenderMode.Prerender },
  { path: 'how-it-works', renderMode: RenderMode.Prerender },
  { path: 'legal/**', renderMode: RenderMode.Prerender },
  { path: '404', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
