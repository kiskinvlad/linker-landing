/**
 * Whether Stripe is listed as our payment processor (stripe-payments 4.3).
 *
 * The Subprocessors page promises 30 days' notice before a new provider, so
 * the Stripe entry is written now and published by flipping this on the
 * notice date. In the same commit, set the `version` of `subprocessors` and
 * `privacy` in `legal.content.ts` to that date. Paid plans go on sale
 * (`PAID_PLANS_ON_SALE`) no sooner than 30 days later.
 */
export const PAYMENT_PROCESSOR_LISTED = false;

const NOT_YET =
  '**Payments.** Paid plans are not available yet. Before they launch, we will add our payment processor here at least 30 days in advance.';

const STRIPE = [
  '**Payments.** When you buy or manage a paid plan, this provider processes billing data about you as our payment processor:',
  '',
  '| Provider | What they do | When |',
  '|---|---|---|',
  '| **Stripe** (Stripe, Inc. and its affiliates) | Payment processing for paid plans: checkout, subscriptions, invoices and tax calculation. Card details go to Stripe directly and never reach us | Only when you buy or manage a paid plan |',
].join('\n');

const PRIVACY_CONDITION = '**Billing data** (when paid plans are available) — ';

/**
 * The Subprocessors page and the Privacy Policy as published: before the
 * notice date they say paid plans are not available; from it, they name
 * Stripe. Throws if the source text moved, so a reworded document can't
 * silently lose the switch.
 */
export function withPaymentProcessor(
  slug: 'subprocessors' | 'privacy',
  markdown: string,
  listed = PAYMENT_PROCESSOR_LISTED,
): string {
  const [from, to] =
    slug === 'subprocessors' ? [NOT_YET, STRIPE] : [PRIVACY_CONDITION, '**Billing data** — '];
  if (!markdown.includes(from)) {
    throw new Error(`${slug}: the payment-processor text to switch is missing`);
  }
  return listed ? markdown.replace(from, to) : markdown;
}
