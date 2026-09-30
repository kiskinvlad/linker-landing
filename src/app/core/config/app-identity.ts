import { InjectionToken } from '@angular/core';

// Angular's build replaces this with `false` in production, so the dev-only branch
// below is removed from the bundle entirely (isDevMode() is a runtime call and
// would leave the localhost URL in the shipped JS).
declare const ngDevMode: unknown;

/**
 * Everything that names the product or points at a domain (plan §14 "Configurable
 * identity"). Templates, SEO and JSON-LD read from here so the M8 switch from the
 * `linker.com` placeholder to the registered Kitlet domain is config, not a refactor.
 */
export interface AppIdentity {
  productName: string;
  /** Absolute origin, no trailing slash. Used for canonical URLs and JSON-LD. */
  siteUrl: string;
  /**
   * The API's base URL including the version prefix, no trailing slash. A separate
   * host (plan D3), same registrable site, so the session cookie is sent with
   * `credentials: include` and `SameSite=Lax` holds. `null` means no API: every
   * visitor is treated as signed out and auth forms report the service unavailable.
   */
  apiUrl: string | null;
  /** Same-origin path the editor SPA is served from (plan D2). */
  editorPath: string;
  legalEntity: string;
}

export const APP_IDENTITY = new InjectionToken<AppIdentity>('APP_IDENTITY', {
  providedIn: 'root',
  factory: () => ({
    productName: 'Kitlet',
    // Placeholder until the Kitlet domain is registered in milestone M8.
    siteUrl: 'https://linker.com',
    // Dev: the backend's `pnpm start:dev` on :3000. localhost:4000 → localhost:3000
    // is same-site, so cookies behave as in production (plan §2 "Dev setup").
    // Production: none until the API is deployed on the real domain (M8). NOT
    // api.linker.com — linker.com is a placeholder owned by someone else, and every
    // page load would send them a request.
    apiUrl: typeof ngDevMode !== 'undefined' && ngDevMode ? 'http://localhost:3000/api/v1' : null,
    editorPath: '/editor/',
    legalEntity: 'Vladyslav Kiskin',
  }),
});
