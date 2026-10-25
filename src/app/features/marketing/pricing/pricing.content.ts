import { breadcrumbs, faqPage, softwareApplication } from '../../../core/seo/json-ld';
import { RouteSeo } from '../../../core/seo/seo.service';

/** /pricing copy and SEO. Kept apart from the component so the route table stays lazy. */
export const INCLUDED = [
  {
    title: $localize`:@@pricing.included.editor.title:Visual editor`,
    body: $localize`:@@pricing.included.editor.body:Drag, drop and restyle offers and forms. No code, no theme edits.`,
  },
  {
    title: $localize`:@@pricing.included.isolation.title:Style isolation`,
    body: $localize`:@@pricing.included.isolation.body:Widgets run in their own Shadow DOM, so they never clash with your site.`,
  },
  {
    title: $localize`:@@pricing.included.versions.title:Versions and rollback`,
    body: $localize`:@@pricing.included.versions.body:Saves are kept as versions (10 per widget on Free). Go back to any of them in one click.`,
  },
  {
    title: $localize`:@@pricing.included.anySite.title:Any website`,
    body: $localize`:@@pricing.included.anySite.body:One snippet works on hosted store builders, WordPress and hand-built sites.`,
  },
] as const;

export const PRICING_FAQ = [
  {
    q: $localize`:@@pricing.faq.card.q:Do I need a credit card for the Free plan?`,
    a: $localize`:@@pricing.faq.card.a:No. Sign up with your email and start building straight away.`,
  },
  {
    q: $localize`:@@pricing.faq.pro.q:When is Pro coming?`,
    a: $localize`:@@pricing.faq.pro.a:Pro is in the works. We’ll publish its price and limits on this page before it launches.`,
  },
  {
    q: $localize`:@@pricing.faq.analytics.q:Is Analytics included on the Free plan?`,
    a: $localize`:@@pricing.faq.analytics.a:Analytics is part of every paid plan. On Free you can open it and explore it with sample data. Your widgets’ own statistics are collected from the first view and Free keeps the last 30 days, so those are there when you upgrade; paid plans keep 13 months.`,
  },
  {
    q: $localize`:@@pricing.faq.ai.q:What are AI credits?`,
    a: $localize`:@@pricing.faq.ai.a:Paid plans include an AI assistant that drafts widgets from a sentence you type and changes them on request. Each request for drafts uses 5 credits, an edit uses 1, and a plan includes 1,000 a month. A request the assistant declines, or one that fails, uses none. Credits reset at the start of each month and don’t roll over.`,
  },
  {
    q: $localize`:@@pricing.faq.reward.q:Can I get paid features without paying?`,
    a: $localize`:@@pricing.faq.reward.a:Yes, through the idea reward. Suggest a feature; if we ship it as part of a paid plan, it’s unlocked on your account for free for as long as your account is active. Plan limits such as widget counts are never unlocked this way.`,
  },
] as const;

export const PRICING_SEO: RouteSeo = {
  title: $localize`:@@nav.pricing:Pricing`,
  ogImage: 'pricing',
  description: $localize`:@@pricing.seo.description:Start free with one live widget and 10,000 views a month — no credit card. Pro with more widgets, more views and full analytics is coming soon.`,
  jsonLd: (siteUrl, productName) => [
    softwareApplication(siteUrl, productName),
    faqPage(PRICING_FAQ),
    breadcrumbs(siteUrl, [{ name: $localize`:@@nav.pricing:Pricing`, path: '/pricing' }]),
  ],
};
