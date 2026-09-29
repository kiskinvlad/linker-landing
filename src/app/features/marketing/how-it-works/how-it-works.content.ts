import { breadcrumbs } from '../../../core/seo/json-ld';
import { RouteSeo } from '../../../core/seo/seo.service';

/**
 * The six-step guide from plan §10a. Kept apart from the component so the route
 * table stays lazy; the same list feeds the page and its `HowTo` JSON-LD.
 */
export const GUIDE_STEPS = [
  {
    title: 'Sign up free',
    body: 'Create an account with your email and confirm it. No credit card, no trial clock.',
    points: ['Takes under a minute', 'The Free plan never expires'],
  },
  {
    title: 'Pick an offer',
    body: 'Choose what you want visitors to do: claim a discount, join your list, request a callback or answer a quick question.',
    points: ['Promo banners and popups', 'Lead, signup and feedback forms'],
  },
  {
    title: 'Design it',
    body: 'Drag, drop and restyle in the visual editor until it looks like part of your store.',
    points: ['Your colours, fonts and corner style', 'No code'],
  },
  {
    title: 'Connect your store, once',
    body: 'Paste one snippet into your site. Most store builders have a box for custom code — that’s the only technical step, and you do it one time.',
    points: [
      'Works on any website',
      'Widgets run isolated in Shadow DOM, so your theme stays untouched',
    ],
  },
  {
    title: 'Publish and roll back',
    body: 'Publish with a click and your change is live without touching your site again. Made a mistake? Roll back to an earlier version.',
    points: ['Every publish is a saved version', 'One-click rollback'],
  },
  {
    title: 'See what sells',
    body: 'Track views, clicks and submissions per widget, and get notified when a new lead arrives. Keep what works, change what doesn’t.',
    points: ['Per-widget analytics', 'New-submission notifications'],
  },
] as const;

export const HOW_IT_WORKS_SEO: RouteSeo = {
  title: 'How it works',
  description:
    'Six steps from sign-up to a live offer on your store: pick an offer, design it visually, paste one snippet once, publish, and see what sells.',
  jsonLd: (siteUrl, productName) => [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to add an on-brand offer to your website with ${productName}`,
      step: GUIDE_STEPS.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.title,
        text: s.body,
      })),
    },
    breadcrumbs(siteUrl, [{ name: 'How it works', path: '/how-it-works' }]),
  ],
};
