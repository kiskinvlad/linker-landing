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
    title: 'Terms of Service',
    covers: [
      'What the service is, and the Free plan’s limits',
      'Business use only',
      'Acceptable use for widgets that run on your site',
      'Who owns widget content, and the licence we need to host it',
      'Availability, liability, termination and governing law',
      'How changes are announced and accepted again',
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    covers: [
      'Who the data controller is and how to reach them',
      'What we collect, why, and the lawful basis for each',
      'Where data is hosted and how international transfers are covered',
      'How long we keep it, and deletion when you close your account',
      'Your rights under GDPR, UK GDPR, CCPA and similar laws',
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    covers: [
      'Strictly necessary cookies: your session and your consent choice',
      'Optional analytics cookies, set only after you opt in',
      'How to change or withdraw your choice at any time',
    ],
  },
  {
    slug: 'feedback-program',
    title: 'Feedback Program',
    covers: [
      'Who can submit ideas, and how submissions are reviewed',
      'When a shipped idea unlocks a paid feature on your account',
      'How duplicates are handled',
      'Why plan limits are never unlocked through feedback',
      'The licence you grant us for your suggestion',
    ],
  },
];

export function legalSeo(doc: LegalDoc): RouteSeo {
  return {
    title: doc.title,
    description: `${doc.title} — being prepared ahead of launch.`,
    noindex: true,
  };
}
