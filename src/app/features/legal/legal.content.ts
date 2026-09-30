import { RouteSeo } from '../../core/seo/seo.service';

/**
 * The legal center (plan §3, §9, §9a, §10a): one registry that routes, the hub
 * page, the footer and the SEO data all read, so adding a document is one entry
 * here plus its text in `docs/<slug>.md`.
 *
 * Texts are Markdown, bundled as strings (the `.md` loader in angular.json) and
 * imported lazily, so each document is its own chunk and none of them weighs on
 * the pages that don't show it. `{{placeholders}}` in them are filled from
 * `APP_IDENTITY.legal` (see `legalPlaceholders`).
 */

export type LegalSlug =
  | 'terms'
  | 'privacy'
  | 'dpa'
  | 'acceptable-use'
  | 'copyright'
  | 'cookies'
  | 'subprocessors'
  | 'feedback-program';

/** How the hub groups documents: what you sign, what we promise, what we disclose. */
export type LegalGroup = 'agreements' | 'policies' | 'transparency';

export interface LegalDoc {
  slug: LegalSlug;
  title: string;
  /** One sentence: the hub card and the meta description. */
  summary: string;
  group: LegalGroup;
  /**
   * The version is the effective date (ISO). Change it whenever the text changes in
   * substance, and keep a changelog in the commit message.
   */
  version: string;
  /** The Markdown source. */
  load: () => Promise<string>;
}

/**
 * The Terms version users accept in the editor's terms gate (plan §9). The backend's
 * `LEGAL_TERMS_VERSION` must equal it: bump both together, and everyone is asked to
 * accept again on their next editor visit.
 */
export const LEGAL_TERMS_VERSION = '2026-10-01';

/**
 * `false` while the texts still carry placeholder contacts (until M8): every legal
 * page shows a draft notice and is `noindex`, so no crawler keeps a draft as the
 * policy. Flip it together with the real contacts in `APP_IDENTITY.legal`.
 */
export const LEGAL_TEXTS_FINAL = false;

export const LEGAL_DOCS: readonly LegalDoc[] = [
  {
    slug: 'terms',
    title: $localize`:@@legal.terms.title:Terms of Service`,
    summary: $localize`:@@legal.terms.summary:The agreement for using the service: business use only, who is responsible for widget content, billing, liability and how changes work.`,
    group: 'agreements',
    version: LEGAL_TERMS_VERSION,
    load: () => import('./docs/terms.md').then((m) => m.default),
  },
  {
    slug: 'dpa',
    title: $localize`:@@legal.dpa.title:Data Processing Agreement`,
    summary: $localize`:@@legal.dpa.summary:How we process your website visitors’ data on your behalf, with the Standard Contractual Clauses for international transfers.`,
    group: 'agreements',
    version: '2026-10-01',
    load: () => import('./docs/dpa.md').then((m) => m.default),
  },
  {
    slug: 'privacy',
    title: $localize`:@@legal.privacy.title:Privacy Policy`,
    summary: $localize`:@@legal.privacy.summary:What we collect about you and your team, why, where it is stored, how long we keep it and your rights.`,
    group: 'policies',
    version: '2026-10-01',
    load: () => import('./docs/privacy.md').then((m) => m.default),
  },
  {
    slug: 'cookies',
    title: $localize`:@@legal.cookies.title:Cookie Policy`,
    summary: $localize`:@@legal.cookies.summary:The few cookies on our website, the opt-in analytics, and what widgets store on your visitors’ devices.`,
    group: 'policies',
    version: '2026-10-01',
    load: () => import('./docs/cookies.md').then((m) => m.default),
  },
  {
    slug: 'acceptable-use',
    title: $localize`:@@legal.aup.title:Acceptable Use Policy`,
    summary: $localize`:@@legal.aup.summary:What widgets must never be used for, restricted industries, and how to report an abusive widget.`,
    group: 'policies',
    version: '2026-10-01',
    load: () => import('./docs/acceptable-use.md').then((m) => m.default),
  },
  {
    slug: 'copyright',
    title: $localize`:@@legal.copyright.title:Copyright & IP Policy`,
    summary: $localize`:@@legal.copyright.summary:How to report content that infringes your copyright or trademark, and how customers can respond.`,
    group: 'policies',
    version: '2026-10-01',
    load: () => import('./docs/copyright.md').then((m) => m.default),
  },
  {
    slug: 'feedback-program',
    title: $localize`:@@legal.feedback.title:Feedback Program`,
    summary: $localize`:@@legal.feedback.summary:When an idea you suggest unlocks a paid feature on your account, and the rules for rewards.`,
    group: 'policies',
    version: '2026-10-01',
    load: () => import('./docs/feedback-program.md').then((m) => m.default),
  },
  {
    slug: 'subprocessors',
    title: $localize`:@@legal.subprocessors.title:Subprocessors`,
    summary: $localize`:@@legal.subprocessors.summary:Every company that processes personal data for us, what for, and where.`,
    group: 'transparency',
    version: '2026-10-01',
    load: () => import('./docs/subprocessors.md').then((m) => m.default),
  },
];

export const LEGAL_GROUPS: readonly { id: LegalGroup; title: string }[] = [
  { id: 'agreements', title: $localize`:@@legal.group.agreements:Agreements` },
  { id: 'policies', title: $localize`:@@legal.group.policies:Policies` },
  { id: 'transparency', title: $localize`:@@legal.group.transparency:Transparency` },
];

export function legalSeo(doc: LegalDoc): RouteSeo {
  return { title: doc.title, description: doc.summary, noindex: !LEGAL_TEXTS_FINAL };
}

export const LEGAL_HUB_SEO: RouteSeo = {
  title: $localize`:@@legal.hub.seo.title:Legal center`,
  description: $localize`:@@legal.hub.seo.description:Terms, privacy, data processing and acceptable-use policies, and how to report an abusive widget.`,
  noindex: !LEGAL_TEXTS_FINAL,
};
