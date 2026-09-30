import { RouteSeo } from '../../core/seo/seo.service';

/**
 * Legal documents (plan §3, §9, §9a, §10a). The real texts are milestone M7,
 * drafted from published SaaS templates; until then each route renders a
 * placeholder saying what the document will cover, marked `noindex` so no
 * crawler indexes a stub as the policy.
 */
export interface LegalDoc {
  slug: string;
  title: string;
  covers: string[];
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: 'terms',
    title: $localize`:@@legal.terms.title:Terms of Service`,
    covers: [
      $localize`:@@legal.terms.c1:What the service is, and the Free plan’s limits`,
      $localize`:@@legal.terms.c2:Business use only`,
      $localize`:@@legal.terms.c3:Acceptable use for widgets that run on your site`,
      $localize`:@@legal.terms.c4:Who owns widget content, and the licence we need to host it`,
      $localize`:@@legal.terms.c5:Availability, liability, termination and governing law`,
      $localize`:@@legal.terms.c6:How changes are announced and accepted again`,
    ],
  },
  {
    slug: 'privacy',
    title: $localize`:@@legal.privacy.title:Privacy Policy`,
    covers: [
      $localize`:@@legal.privacy.c1:Who the data controller is and how to reach them`,
      $localize`:@@legal.privacy.c2:What we collect, why, and the lawful basis for each`,
      $localize`:@@legal.privacy.c3:Where data is hosted and how international transfers are covered`,
      $localize`:@@legal.privacy.c4:How long we keep it, and deletion when you close your account`,
      $localize`:@@legal.privacy.c5:Your rights under GDPR, UK GDPR, CCPA and similar laws`,
    ],
  },
  {
    slug: 'cookies',
    title: $localize`:@@legal.cookies.title:Cookie Policy`,
    covers: [
      $localize`:@@legal.cookies.c1:Strictly necessary cookies: your session, your consent choice and your language choice`,
      $localize`:@@legal.cookies.c2:Optional analytics cookies, set only after you opt in`,
      $localize`:@@legal.cookies.c3:How to change or withdraw your choice at any time`,
    ],
  },
  {
    slug: 'feedback-program',
    title: $localize`:@@legal.feedback.title:Feedback Program`,
    covers: [
      $localize`:@@legal.feedback.c1:Who can submit ideas, and how submissions are reviewed`,
      $localize`:@@legal.feedback.c2:When a shipped idea unlocks a paid feature on your account`,
      $localize`:@@legal.feedback.c3:How duplicates are handled`,
      $localize`:@@legal.feedback.c4:Why plan limits are never unlocked through feedback`,
      $localize`:@@legal.feedback.c5:The licence you grant us for your suggestion`,
    ],
  },
];

export function legalSeo(doc: LegalDoc): RouteSeo {
  return {
    title: doc.title,
    description: $localize`:@@legal.seo.description:${doc.title}:documentTitle: — being prepared ahead of launch.`,
    noindex: true,
  };
}
