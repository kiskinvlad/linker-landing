import { InjectionToken } from '@angular/core';

/**
 * Cookie consent (plan §8). Two categories:
 *   - necessary: the API session cookie and this consent cookie (and the language
 *     choice). Strictly necessary, always on, disclosed in the cookie policy.
 *   - analytics: Google Analytics 4. Opt-in only.
 */
export type ConsentCategory = 'analytics';

/** What the `linker_consent` cookie stores. Nothing personal: a version, one flag, a time. */
export interface ConsentRecord {
  /** Policy version the choice was made under. A newer one re-asks. */
  v: number;
  analytics: boolean;
  /** When the choice was made, ms since epoch. */
  ts: number;
}

export const CONSENT_COOKIE = 'linker_consent';

/** Twelve months, the plan's retention for the choice. */
export const CONSENT_MAX_AGE_S = 60 * 60 * 24 * 365;

/**
 * Bump when the cookie policy changes in a way people must see: every stored choice
 * made under an older version is ignored and the banner asks again.
 */
export const CONSENT_POLICY_VERSION = new InjectionToken<number>('CONSENT_POLICY_VERSION', {
  providedIn: 'root',
  factory: () => 1,
});

/**
 * Something that turns a consent category on and off, e.g. the GA4 loader
 * (strategy, plan §5). `ConsentService` calls `grant` when the category becomes
 * granted and `revoke` when it is withdrawn; a loader never decides on its own.
 */
export interface ConsentLoader {
  readonly category: ConsentCategory;
  grant(): void;
  revoke(): void;
}

export const CONSENT_LOADERS = new InjectionToken<readonly ConsentLoader[]>('CONSENT_LOADERS', {
  providedIn: 'root',
  factory: () => [],
});
