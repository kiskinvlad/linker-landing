/**
 * Whether production sells paid plans (stripe-payments 4.4). Prerendered copy
 * (the pricing FAQ, its description) can't ask the API, so it follows this
 * switch; the plan cards and the account page ask the API (`purchasable`) and
 * need no flag.
 *
 * Flip to `true` in the same release that sets `BILLING_PROVIDER=stripe` in
 * production, at least 30 days after Stripe is listed as a subprocessor
 * (`PAYMENT_PROCESSOR_LISTED` in the legal content).
 */
export const PAID_PLANS_ON_SALE = false;
