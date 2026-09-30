import { LOCALE_ID, inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { APP_IDENTITY, AppIdentity } from '../../core/config/app-identity';
import { localeById } from '../../core/i18n/locales';
import { LegalDoc } from './legal.content';
import { RenderedLegalDoc, fillPlaceholders, renderLegalMarkdown } from './legal-markdown';

/**
 * Loads and renders a document before its route activates, so the prerendered HTML
 * already holds the full text (no flash of an empty page, and crawlers and no-JS
 * visitors get the document).
 */
export const legalDocResolver: ResolveFn<RenderedLegalDoc> = async (route) => {
  const doc = route.data['doc'] as LegalDoc;
  const identity = inject(APP_IDENTITY);
  // Each language is its own build under its own prefix; site links in the texts
  // are written as `/legal/…` and must stay in the reader's language.
  const { prefix } = localeById(inject(LOCALE_ID));
  const source = await doc.load();
  return renderLegalMarkdown(fillPlaceholders(source, legalPlaceholders(identity)), {
    resolvePath: (path) => prefix + path,
  });
};

/** Every `{{name}}` the texts may use. An unlisted name fails the prerender. */
export function legalPlaceholders({
  productName,
  siteUrl,
  legal,
}: AppIdentity): Record<string, string> {
  // English on purpose: it is part of the document text, which is English-only.
  const notAppointed = `Not yet appointed. Until then, contact us directly at ${legal.contacts.privacy}.`;
  return {
    productName,
    siteUrl,
    legalEntity: legal.entity,
    legalAddress: legal.address,
    dataRegion: legal.dataRegion,
    legalEmail: legal.contacts.legal,
    privacyEmail: legal.contacts.privacy,
    abuseEmail: legal.contacts.abuse,
    copyrightEmail: legal.contacts.copyright,
    securityEmail: legal.contacts.security,
    euRepresentative: legal.euRepresentative ?? notAppointed,
    ukRepresentative: legal.ukRepresentative ?? notAppointed,
  };
}
