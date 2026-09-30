import { breadcrumbs } from '../../../core/seo/json-ld';
import { RouteSeo } from '../../../core/seo/seo.service';

/**
 * The six-step guide from plan §10a. Kept apart from the component so the route
 * table stays lazy; the same list feeds the page and its `HowTo` JSON-LD.
 */
export const GUIDE_STEPS = [
  {
    title: $localize`:@@guide.signup.title:Sign up free`,
    body: $localize`:@@guide.signup.body:Create an account with your email and confirm it. No credit card, no trial clock.`,
    points: [
      $localize`:@@guide.signup.point1:Takes under a minute`,
      $localize`:@@guide.signup.point2:The Free plan never expires`,
    ],
  },
  {
    title: $localize`:@@guide.offer.title:Pick an offer`,
    body: $localize`:@@guide.offer.body:Choose what you want visitors to do: claim a discount, join your list, request a callback or answer a quick question.`,
    points: [
      $localize`:@@guide.offer.point1:Promo banners and popups`,
      $localize`:@@guide.offer.point2:Lead, signup and feedback forms`,
    ],
  },
  {
    title: $localize`:@@guide.design.title:Design it`,
    body: $localize`:@@guide.design.body:Drag, drop and restyle in the visual editor until it looks like part of your store.`,
    points: [
      $localize`:@@guide.design.point1:Your colours, fonts and corner style`,
      $localize`:@@guide.design.point2:No code`,
    ],
  },
  {
    title: $localize`:@@guide.connect.title:Connect your store, once`,
    body: $localize`:@@guide.connect.body:Paste one snippet into your site. Most store builders have a box for custom code — that’s the only technical step, and you do it one time.`,
    points: [
      $localize`:@@guide.connect.point1:Works on any website`,
      $localize`:@@guide.connect.point2:Widgets run isolated in Shadow DOM, so your theme stays untouched`,
    ],
  },
  {
    title: $localize`:@@guide.publish.title:Publish and roll back`,
    body: $localize`:@@guide.publish.body:Publish with a click and your change is live without touching your site again. Made a mistake? Roll back to an earlier version.`,
    points: [
      $localize`:@@guide.publish.point1:Every publish is a saved version`,
      $localize`:@@guide.publish.point2:One-click rollback`,
    ],
  },
  {
    title: $localize`:@@guide.measure.title:See what sells`,
    body: $localize`:@@guide.measure.body:Track views, clicks and submissions per widget, and get notified when a new lead arrives. Keep what works, change what doesn’t.`,
    points: [
      $localize`:@@guide.measure.point1:Per-widget analytics`,
      $localize`:@@guide.measure.point2:New-submission notifications`,
    ],
  },
] as const;

export const HOW_IT_WORKS_SEO: RouteSeo = {
  title: $localize`:@@nav.howItWorks:How it works`,
  ogImage: 'how-it-works',
  description: $localize`:@@guide.seo.description:Six steps from sign-up to a live offer on your store: pick an offer, design it visually, paste one snippet once, publish, and see what sells.`,
  jsonLd: (siteUrl, productName) => [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: $localize`:@@guide.seo.howToName:How to add an on-brand offer to your website with ${productName}:productName:`,
      step: GUIDE_STEPS.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.title,
        text: s.body,
      })),
    },
    breadcrumbs(siteUrl, [
      { name: $localize`:@@nav.howItWorks:How it works`, path: '/how-it-works' },
    ]),
  ],
};
