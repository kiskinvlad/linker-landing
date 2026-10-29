import { PAID_PLANS_ON_SALE } from '../../../core/billing/paid-plans';
import { BILLING_FAQ, PRICING_FAQ, PRICING_SEO } from './pricing.content';

describe('pricing content', () => {
  it('says Pro is coming until paid plans are on sale', () => {
    expect(PAID_PLANS_ON_SALE).toBe(false);
    expect(PRICING_FAQ.map((item) => item.q)).toContain('When is Pro coming?');
    expect(PRICING_SEO.description).toContain('coming soon');
  });

  it('has the billing answers ready for launch', () => {
    const text = BILLING_FAQ.map((item) => item.a).join(' ');
    expect(text).toContain('sold by Paddle');
    expect(text).toContain('never reach us');
    expect(text).toContain('monthly or yearly');
    expect(text).toContain('ours include it too');
    expect(text).toContain('until the end of the period');
    expect(text).toContain('Nothing you built is deleted');
  });
});
