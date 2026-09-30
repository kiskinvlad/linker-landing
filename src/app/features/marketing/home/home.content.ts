/**
 * Home page copy. Each string carries a stable label (`@@home.…`) that is its key
 * in the vocabularies under src/locale/; the text here is the English source.
 */

export const AUDIENCES = [
  {
    icon: 'store',
    title: $localize`:@@home.audience.stores.title:Online stores`,
    body: $localize`:@@home.audience.stores.body:Launch a discount, a free-shipping bar or a bundle offer the moment you think of it.`,
  },
  {
    icon: 'box',
    title: $localize`:@@home.audience.dropshippers.title:Dropshippers`,
    body: $localize`:@@home.audience.dropshippers.body:Test a new offer on every product page in minutes and keep the one that converts.`,
  },
  {
    icon: 'pin',
    title: $localize`:@@home.audience.local.title:Local businesses`,
    body: $localize`:@@home.audience.local.body:Collect bookings, callbacks and enquiries straight from the site you already have.`,
  },
  {
    icon: 'spark',
    title: $localize`:@@home.audience.brands.title:Small brands`,
    body: $localize`:@@home.audience.brands.body:Grow your list with signup forms that look like your brand, not like a plugin.`,
  },
] as const;

export const STEPS = [
  {
    n: '01',
    title: $localize`:@@home.steps.design.title:Design`,
    body: $localize`:@@home.steps.design.body:Pick an offer or form, then drag, drop and restyle it in a visual editor. Your colours and fonts come along automatically.`,
  },
  {
    n: '02',
    title: $localize`:@@home.steps.publish.title:Publish`,
    body: $localize`:@@home.steps.publish.body:Paste one snippet into your site once. Every change after that goes live with a click — no redeploy, no developer.`,
  },
  {
    n: '03',
    title: $localize`:@@home.steps.measure.title:Measure`,
    body: $localize`:@@home.steps.measure.body:See views, clicks and submissions per widget, and get notified when a new lead comes in.`,
  },
] as const;

export const BENEFITS = [
  {
    title: $localize`:@@home.benefits.noDev.title:No developer time`,
    body: $localize`:@@home.benefits.noDev.body:Build and change offers yourself. The only technical step is pasting one line of code, once.`,
  },
  {
    title: $localize`:@@home.benefits.onBrand.title:On-brand by default`,
    body: $localize`:@@home.benefits.onBrand.body:Widgets pick up your colours, type and corner style, so they look like part of your store.`,
  },
  {
    title: $localize`:@@home.benefits.isolation.title:Never clashes with your site`,
    body: $localize`:@@home.benefits.isolation.body:Every widget runs in its own isolated Shadow DOM — your theme’s CSS can’t break it, and it can’t break your theme.`,
  },
  {
    title: $localize`:@@home.benefits.rollback.title:History and instant rollback`,
    body: $localize`:@@home.benefits.rollback.body:Every save becomes a version. Went live with a typo? Roll back to the previous version in one click.`,
  },
  {
    title: $localize`:@@home.benefits.analytics.title:Analytics and notifications`,
    body: $localize`:@@home.benefits.analytics.body:Know which offer people actually click, and hear about new submissions as they happen.`,
  },
] as const;

export const USE_CASES = [
  {
    kind: 'lead',
    title: $localize`:@@home.useCases.lead.title:Lead capture forms`,
    body: $localize`:@@home.useCases.lead.body:Callbacks, quotes and enquiries, delivered to your inbox.`,
  },
  {
    kind: 'promo',
    title: $localize`:@@home.useCases.promo.title:Promo banners`,
    body: $localize`:@@home.useCases.promo.body:Sales, coupon codes and free-shipping thresholds.`,
  },
  {
    kind: 'news',
    title: $localize`:@@home.useCases.news.title:Newsletter signup`,
    body: $localize`:@@home.useCases.news.body:Grow your list with a form that matches your brand.`,
  },
  {
    kind: 'feedback',
    title: $localize`:@@home.useCases.feedback.title:Feedback widgets`,
    body: $localize`:@@home.useCases.feedback.body:Ask one quick question and learn why people don’t buy.`,
  },
] as const;

export const FAQ = [
  {
    q: $localize`:@@home.faq.developer.q:Do I need a developer?`,
    a: $localize`:@@home.faq.developer.a:No. You design everything in the visual editor. The only technical step is pasting one snippet into your site, once — most store builders have a box for exactly that.`,
  },
  {
    q: $localize`:@@home.faq.compat.q:Will it work on my website?`,
    a: $localize`:@@home.faq.compat.a:If you can add a snippet of code to your site, it works — hosted store builders, WordPress and hand-built sites alike.`,
  },
  {
    q: $localize`:@@home.faq.speed.q:Will a widget slow down or break my site?`,
    a: $localize`:@@home.faq.speed.a:Widgets load after your page and run inside their own Shadow DOM, so your theme’s styles can’t leak in and theirs can’t leak out.`,
  },
  {
    q: $localize`:@@home.faq.free.q:What does the Free plan include?`,
    a: $localize`:@@home.faq.free.a:One live widget, 10,000 widget views a month and 10 saved versions per widget. No credit card is needed to sign up.`,
  },
  {
    q: $localize`:@@home.faq.mistake.q:What if I publish a mistake?`,
    a: $localize`:@@home.faq.mistake.a:Your saves are kept as versions — 10 per widget on the Free plan. Roll back to any of them with one click and it’s live again straight away.`,
  },
  {
    q: $localize`:@@home.faq.reward.q:How does the idea reward work?`,
    a: $localize`:@@home.faq.reward.a:Suggest a feature. If we build it and it ships as part of a paid plan, it’s unlocked on your account for free, on any plan, for as long as your account is active. Ideas that ship to every plan reach you anyway — you get a thank-you. Plan limits such as widget counts are never unlocked this way.`,
  },
] as const;
