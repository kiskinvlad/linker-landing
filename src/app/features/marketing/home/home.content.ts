/**
 * Home page copy and data, kept out of the templates so it has one home until
 * the i18n layer (plan D4) turns these strings into translation keys.
 */

export const AUDIENCES = [
  {
    icon: 'store',
    title: 'Online stores',
    body: 'Launch a discount, a free-shipping bar or a bundle offer the moment you think of it.',
  },
  {
    icon: 'box',
    title: 'Dropshippers',
    body: 'Test a new offer on every product page in minutes and keep the one that converts.',
  },
  {
    icon: 'pin',
    title: 'Local businesses',
    body: 'Collect bookings, callbacks and enquiries straight from the site you already have.',
  },
  {
    icon: 'spark',
    title: 'Small brands',
    body: 'Grow your list with signup forms that look like your brand, not like a plugin.',
  },
] as const;

export const STEPS = [
  {
    n: '01',
    title: 'Design',
    body: 'Pick an offer or form, then drag, drop and restyle it in a visual editor. Your colours and fonts come along automatically.',
  },
  {
    n: '02',
    title: 'Publish',
    body: 'Paste one snippet into your site once. Every change after that goes live with a click — no redeploy, no developer.',
  },
  {
    n: '03',
    title: 'Measure',
    body: 'See views, clicks and submissions per widget, and get notified when a new lead comes in.',
  },
] as const;

export const BENEFITS = [
  {
    title: 'No developer time',
    body: 'Build and change offers yourself. The only technical step is pasting one line of code, once.',
  },
  {
    title: 'On-brand by default',
    body: 'Widgets pick up your colours, type and corner style, so they look like part of your store.',
  },
  {
    title: 'Never clashes with your site',
    body: 'Every widget runs in its own isolated Shadow DOM — your theme’s CSS can’t break it, and it can’t break your theme.',
  },
  {
    title: 'History and instant rollback',
    body: 'Every save becomes a version. Went live with a typo? Roll back to the previous version in one click.',
  },
  {
    title: 'Analytics and notifications',
    body: 'Know which offer people actually click, and hear about new submissions as they happen.',
  },
] as const;

export const USE_CASES = [
  {
    kind: 'lead',
    title: 'Lead capture forms',
    body: 'Callbacks, quotes and enquiries, delivered to your inbox.',
  },
  {
    kind: 'promo',
    title: 'Promo banners',
    body: 'Sales, coupon codes and free-shipping thresholds.',
  },
  {
    kind: 'news',
    title: 'Newsletter signup',
    body: 'Grow your list with a form that matches your brand.',
  },
  {
    kind: 'feedback',
    title: 'Feedback widgets',
    body: 'Ask one quick question and learn why people don’t buy.',
  },
] as const;

export const FAQ = [
  {
    q: 'Do I need a developer?',
    a: 'No. You design everything in the visual editor. The only technical step is pasting one snippet into your site, once — most store builders have a box for exactly that.',
  },
  {
    q: 'Will it work on my website?',
    a: 'If you can add a snippet of code to your site, it works — hosted store builders, WordPress and hand-built sites alike.',
  },
  {
    q: 'Will a widget slow down or break my site?',
    a: 'Widgets load after your page and run inside their own Shadow DOM, so your theme’s styles can’t leak in and theirs can’t leak out.',
  },
  {
    q: 'What does the Free plan include?',
    a: 'One live widget, 10,000 widget views a month and 10 saved versions per widget. No credit card is needed to sign up.',
  },
  {
    q: 'What if I publish a mistake?',
    a: 'Your saves are kept as versions — 10 per widget on the Free plan. Roll back to any of them with one click and it’s live again straight away.',
  },
  {
    q: 'How does the idea reward work?',
    a: 'Suggest a feature. If we build it and it ships as part of a paid plan, it’s unlocked on your account for free, on any plan, for as long as your account is active. Ideas that ship to every plan reach you anyway — you get a thank-you. Plan limits such as widget counts are never unlocked this way.',
  },
] as const;
