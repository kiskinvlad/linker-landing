/**
 * Whether Paddle is published as our reseller and merchant of record
 * (stripe-payments 4.4, design D13).
 *
 * The Subprocessors page promises 30 days' notice before a new provider, so
 * the Paddle texts are written now and published by flipping this on the
 * notice date. In the same commit:
 * - set the `version` of `subprocessors`, `privacy` and `cookies` in
 *   `legal.content.ts` to that date;
 * - bump `LEGAL_TERMS_VERSION` on both sides (the Terms' Payment section
 *   changes), so every account accepts the Terms again on next sign-in.
 * Paid plans go on sale (`PAID_PLANS_ON_SALE`) no sooner than 30 days later.
 */
export const PAYMENT_PROCESSOR_LISTED = false;

/** The documents whose text changes on the notice date. */
export type PaymentDocument = 'subprocessors' | 'privacy' | 'terms' | 'cookies';

const SUBPROCESSORS_BEFORE =
  '**Payments.** Paid plans are not available yet. Before they launch, we will add our payment processor here at least 30 days in advance.';

const SUBPROCESSORS_AFTER = [
  '**Payments.** Paid plans are sold by our reseller, Paddle. When you buy or manage a paid plan, Paddle processes billing data about you as an independent controller, under its own privacy notice:',
  '',
  '| Provider | What they do | When |',
  '|---|---|---|',
  '| **Paddle** (Paddle.com Market Ltd and its affiliates) | Reseller and merchant of record for paid plans: checkout, subscriptions, invoices, tax calculation and collection, payment support. Card details go to Paddle directly and never reach us | Only when you buy or manage a paid plan |',
].join('\n');

const TERMS_BEFORE =
  '**Payment.** Fees are billed in advance through the payment processor named on our [Subprocessors](/legal/subprocessors) page. We do not store full payment card details. Prices exclude taxes unless stated; you are responsible for applicable taxes, except where the payment processor acts as merchant of record and collects them.';

const TERMS_AFTER =
  "**Payment.** Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders: it sells you the subscription, charges the fees in advance, calculates and collects applicable taxes, issues invoices and handles payment questions, under [Paddle's Buyer Terms](https://www.paddle.com/legal/checkout-buyer-terms). We do not receive or store your payment card details. Prices on our pricing page exclude taxes, which Paddle adds at checkout where they apply.";

const COOKIES_BEFORE =
  '| `kit_lang` | Us | Remembers the language you picked | Strictly necessary | 12 months |';

const COOKIES_AFTER = [
  COOKIES_BEFORE,
  '| Checkout cookies | Paddle | Run the secure payment form, only on our checkout page and only when you open it to buy a plan | Strictly necessary | As set by Paddle |',
].join('\n');

const SWITCHES: Record<PaymentDocument, readonly [string, string]> = {
  subprocessors: [SUBPROCESSORS_BEFORE, SUBPROCESSORS_AFTER],
  privacy: ['**Billing data** (when paid plans are available) — ', '**Billing data** — '],
  terms: [TERMS_BEFORE, TERMS_AFTER],
  cookies: [COOKIES_BEFORE, COOKIES_AFTER],
};

/**
 * A legal document as published: before the notice date it says paid plans
 * are not available (or stays generic); from it, it names Paddle. Throws if
 * the source text moved, so a reworded document can't silently lose the
 * switch.
 */
export function withPaymentProcessor(
  slug: PaymentDocument,
  markdown: string,
  listed = PAYMENT_PROCESSOR_LISTED,
): string {
  const [from, to] = SWITCHES[slug];
  if (!markdown.includes(from)) {
    throw new Error(`${slug}: the payment-processor text to switch is missing`);
  }
  return listed ? markdown.replace(from, to) : markdown;
}
