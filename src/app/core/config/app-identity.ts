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
  /** Who the legal documents name, and where to reach them (plan §9a, §14). */
  legal: LegalIdentity;
}

/**
 * The facts the legal documents are filled in from: `{{legalEntity}}`,
 * `{{privacyEmail}}` … in the texts under features/legal/docs. Changing a value here
 * changes every document, so the M8 switch to real contacts is one edit (then flip
 * `LEGAL_TEXTS_FINAL` in features/legal/legal.content.ts).
 */
export interface LegalIdentity {
  /** Operator and data controller, as it should appear in contracts. */
  entity: string;
  /** Postal address for legal notices (GDPR Art. 13 and DMCA need one). */
  address: string;
  /** Where Service data is stored, as a reader should see it. */
  dataRegion: string;
  contacts: {
    /** Contract notices, appeals, the DSA point of contact. */
    legal: string;
    /** Data-subject requests (plan §14: `privacy@<domain>`). */
    privacy: string;
    /** Reports of illegal or abusive widgets. */
    abuse: string;
    /** Copyright and trademark notices (the DMCA designated agent's address). */
    copyright: string;
    /** Vulnerability reports and account-compromise notices. */
    security: string;
  };
  /** GDPR Art. 27 representative, once appointed (plan M7). */
  euRepresentative: string | null;
  /** UK GDPR Art. 27 representative, once appointed. */
  ukRepresentative: string | null;
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
    legal: {
      // Plan §15 Q3: name the legal form once decided (e.g. "FOP Vladyslav Kiskin").
      entity: 'Vladyslav Kiskin',
      // TODO(M8): a full postal address for legal notices.
      address: 'Kyiv, Ukraine',
      // Plan §14 recommends eu-central-1; confirm before publishing (§15 Q4).
      dataRegion: 'the European Union (Frankfurt, Germany)',
      // `.example` is reserved (RFC 2606) and can never receive mail: obviously a
      // placeholder, and nobody else's inbox. Replaced by the real aliases in M8.
      contacts: {
        legal: 'legal@kitlet.example',
        privacy: 'privacy@kitlet.example',
        abuse: 'abuse@kitlet.example',
        copyright: 'copyright@kitlet.example',
        security: 'security@kitlet.example',
      },
      euRepresentative: null,
      ukRepresentative: null,
    },
  }),
});
