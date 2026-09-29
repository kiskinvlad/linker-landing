import { InjectionToken } from '@angular/core';

/**
 * Everything that names the product or points at a domain (plan §14 "Configurable
 * identity"). Templates, SEO and JSON-LD read from here so the M8 switch from the
 * `linker.com` placeholder to the registered Kitlet domain is config, not a refactor.
 */
export interface AppIdentity {
  productName: string;
  /** Absolute origin, no trailing slash. Used for canonical URLs and JSON-LD. */
  siteUrl: string;
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
    editorPath: '/editor/',
    legalEntity: 'Vladyslav Kiskin',
  }),
});
