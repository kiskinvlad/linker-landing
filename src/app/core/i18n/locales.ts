/**
 * Supported languages (plan D4). Each is a separate prerendered build of the app
 * (Angular i18n, `localize: true`), served under its own path prefix.
 *
 * Adding a language = an entry here, a `locales` entry in angular.json, a
 * `src/locale/messages.<id>.json` vocabulary, and the same language in
 * `LANG_REDIRECT` in src/index.html.
 */
export interface SiteLocale {
  /** Angular LOCALE_ID and BCP 47 tag: what `<html lang>` and hreflang use. */
  id: 'en' | 'uk';
  /** URL prefix, no trailing slash; '' for the default language at the root. */
  prefix: '' | '/ua';
  /** Short label for the switcher. */
  label: string;
  /** Name in its own language, for the switcher's accessible name. */
  nativeName: string;
  /** Open Graph locale. */
  ogLocale: string;
}

export const LOCALES: readonly SiteLocale[] = [
  { id: 'en', prefix: '', label: 'EN', nativeName: 'English', ogLocale: 'en_US' },
  // Ukrainian is `uk` (ISO 639-1); `UA` is the country, used for the URL and label.
  { id: 'uk', prefix: '/ua', label: 'UA', nativeName: 'Українська', ogLocale: 'uk_UA' },
];

export const DEFAULT_LOCALE = LOCALES[0];

export function localeById(id: string): SiteLocale {
  return LOCALES.find((l) => id === l.id || id.startsWith(`${l.id}-`)) ?? DEFAULT_LOCALE;
}

/**
 * Remembers an explicit language choice. A cookie rather than localStorage so an
 * edge function can redirect before any HTML is sent, once hosting has one.
 * Strictly necessary: it only records a choice the visitor made.
 */
export const LANG_COOKIE = 'kit_lang';
