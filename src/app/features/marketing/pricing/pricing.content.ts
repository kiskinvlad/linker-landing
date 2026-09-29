import { breadcrumbs, faqPage, softwareApplication } from '../../../core/seo/json-ld';
import { RouteSeo } from '../../../core/seo/seo.service';

/** /pricing copy and SEO. Kept apart from the component so the route table stays lazy. */
export const INCLUDED = [
  {
    title: 'Visual editor',
    body: 'Drag, drop and restyle offers and forms. No code, no theme edits.',
  },
  {
    title: 'Style isolation',
    body: 'Widgets run in their own Shadow DOM, so they never clash with your site.',
  },
  {
    title: 'Versions and rollback',
    body: 'Saves are kept as versions (10 per widget on Free). Go back to any of them in one click.',
  },
  {
    title: 'Any website',
    body: 'One snippet works on hosted store builders, WordPress and hand-built sites.',
  },
] as const;

export const PRICING_FAQ = [
  {
    q: 'Do I need a credit card for the Free plan?',
    a: 'No. Sign up with your email and start building straight away.',
  },
  {
    q: 'When is Pro coming?',
    a: 'Pro is in the works. We’ll publish its price and limits on this page before it launches.',
  },
  {
    q: 'Can I get paid features without paying?',
    a: 'Yes, through the idea reward. Suggest a feature; if we ship it as part of a paid plan, it’s unlocked on your account for free for as long as your account is active. Plan limits such as widget counts are never unlocked this way.',
  },
] as const;

export const PRICING_SEO: RouteSeo = {
  title: 'Pricing',
  description:
    'Start free with one live widget and 10,000 views a month — no credit card. Pro with more widgets and views is coming soon.',
  jsonLd: (siteUrl, productName) => [
    softwareApplication(siteUrl, productName),
    faqPage(PRICING_FAQ),
    breadcrumbs(siteUrl, [{ name: 'Pricing', path: '/pricing' }]),
  ],
};
