import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ACCOUNT_API, Plan } from '../../core/api/account.api';
import { ApiError } from '../../core/api/api-error';
import { AuthFacade } from '../../core/auth/auth.facade';
import { SessionStore } from '../../core/auth/session.store';
import { BillingFacade } from '../../core/billing/billing.facade';
import { PRICING_FAQ } from '../../features/marketing/pricing/pricing.content';
import { PlanCards } from './plan-cards';

const plan = (code: string, name: string, priceCents: number, purchasable: boolean): Plan => ({
  code,
  name,
  priceCents,
  annualPriceCents: priceCents * 10,
  currency: 'USD',
  limits: {
    maxWidgets: { pro: 10, growth: 25, business: 100 }[code] ?? 1,
    monthlyViews: { pro: 100_000, growth: 500_000, business: 2_000_000 }[code] ?? 10_000,
    maxVersionsPerWidget: 50,
    aiCreditsPerMonth: { pro: 1000, growth: 2500, business: 5000 }[code] ?? 0,
    features: ['analytics', 'ai_assistant'],
  },
  purchasable,
  intervals: purchasable ? ['month', 'year'] : [],
});

const ON_SALE = [
  plan('free', 'Free', 0, false),
  plan('pro', 'Pro', 1900, true),
  plan('growth', 'Growth', 4900, true),
  plan('business', 'Business', 9900, true),
];

interface Options {
  plans?: Plan[] | Error;
  signedIn?: boolean;
  checkout?: () => Promise<void>;
}

async function render(options: Options = {}) {
  const plans = options.plans ?? [];
  const billing = { checkout: vi.fn(options.checkout ?? (() => Promise.resolve())) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ACCOUNT_API,
        useValue: { plans: () => (plans instanceof Error ? throwError(() => plans) : of(plans)) },
      },
      { provide: AuthFacade, useValue: { ensureKnown: () => Promise.resolve() } },
      { provide: BillingFacade, useValue: billing },
    ],
  });
  const session = TestBed.inject(SessionStore);
  if (options.signedIn) {
    session.setUser({ id: 'u1', email: 'a@b.test' } as never);
  } else {
    session.clear();
  }
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PlanCards);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const upgrade = (name: string) =>
    [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(`Upgrade to ${name}`),
    ) as HTMLButtonElement;
  return { el, billing, navigate, settle, upgrade, fixture };
}

describe('PlanCards', () => {
  it('shows Pro as coming soon while nothing is for sale', async () => {
    const { el } = await render({
      plans: [plan('free', 'Free', 0, false), plan('pro', 'Pro', 1900, false)],
    });

    expect(el.querySelector('.plan--pro')?.textContent).toContain('Coming soon');
    expect(el.querySelector('.plan--paid')).toBeNull();
  });

  it('keeps coming soon when the plans cannot be read', async () => {
    const { el } = await render({ plans: new Error('offline') });

    expect(el.querySelector('.plan--pro')?.textContent).toContain('Coming soon');
  });

  it('offers every purchasable plan with its price and limits, cheapest first', async () => {
    const { el } = await render({ plans: [...ON_SALE].reverse() });

    const cards = [...el.querySelectorAll('.plan--paid')];
    expect(cards.map((c) => c.querySelector('h3')?.textContent)).toEqual([
      'Pro',
      'Growth',
      'Business',
    ]);
    expect(cards[0]?.textContent).toContain('$19');
    expect(cards[0]?.textContent).toContain('10 live widgets');
    expect(cards[0]?.textContent).toContain('100,000 widget views a month');
    expect(cards[0]?.textContent).toContain('AI assistant: 1,000 credits a month');
    expect(cards[1]?.textContent).toContain('$49');
    expect(cards[1]?.textContent).toContain('AI assistant: 2,500 credits a month');
    expect(cards[1]?.textContent).toContain('Everything in Pro');
    expect(cards[2]?.textContent).toContain('$99');
    expect(cards[2]?.textContent).toContain('Priority support');
    expect(el.textContent).not.toContain('Coming soon');
  });

  it('switches every card to yearly prices, and buys yearly', async () => {
    const { el, billing, settle, upgrade, fixture } = await render({
      plans: ON_SALE,
      signedIn: true,
    });

    const yearly = [...el.querySelectorAll('.plans__interval-option')].find((b) =>
      b.textContent?.includes('Yearly'),
    ) as HTMLButtonElement;
    yearly.click();
    fixture.detectChanges();

    const pro = el.querySelector('.plan--paid')!;
    expect(pro.textContent).toContain('$190');
    expect(pro.textContent).toContain('/ year');
    expect(yearly.getAttribute('aria-pressed')).toBe('true');

    upgrade('Pro').click();
    await settle();
    expect(billing.checkout).toHaveBeenCalledWith('pro', 'year');
  });

  it('sends an account that already pays to Change plan on the account page', async () => {
    const { navigate, settle, upgrade } = await render({
      plans: ON_SALE,
      signedIn: true,
      checkout: () => Promise.reject(new ApiError(409, 'x', [], null, 'ALREADY_SUBSCRIBED')),
    });

    upgrade('Growth').click();
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/account'], {
      queryParams: { changePlan: 'growth', interval: 'month' },
    });
  });

  it('sends a signed-out visitor to sign up first, coming back to pricing', async () => {
    const { billing, navigate, settle, upgrade } = await render({ plans: ON_SALE });

    upgrade('Pro').click();
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/register'], {
      queryParams: { plan: 'pro', returnUrl: '/pricing' },
    });
    expect(billing.checkout).not.toHaveBeenCalled();
  });

  it('opens checkout for a signed-in account', async () => {
    const { billing, settle, upgrade } = await render({ plans: ON_SALE, signedIn: true });

    upgrade('Business').click();
    await settle();

    expect(billing.checkout).toHaveBeenCalledWith('business', 'month');
  });

  it('sends an unverified account to confirm its address', async () => {
    const { navigate, settle, upgrade } = await render({
      plans: ON_SALE,
      signedIn: true,
      checkout: () => Promise.reject(new ApiError(403, 'x', [], null, 'EMAIL_NOT_VERIFIED')),
    });

    upgrade('Pro').click();
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/verify-email'], {
      queryParams: { returnUrl: '/pricing' },
    });
  });

  it('asks for the current Terms, linking the account page', async () => {
    const { el, settle, upgrade } = await render({
      plans: ON_SALE,
      signedIn: true,
      checkout: () => Promise.reject(new ApiError(403, 'x', [], null, 'TERMS_NOT_ACCEPTED')),
    });

    upgrade('Pro').click();
    await settle();

    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Accept the current Terms of Service');
    expect(alert.querySelector('a[href="/account#privacy"]')).not.toBeNull();
    expect(upgrade('Pro').disabled).toBe(false);
  });

  describe('the AI assistant', () => {
    it('lists 1,000 AI credits a month on Pro', async () => {
      const { el } = await render();
      expect(el.querySelector('.plan--pro')?.textContent).toContain(
        'AI assistant: 1,000 credits a month',
      );
    });

    it('explains credits in the pricing FAQ', () => {
      const answer = PRICING_FAQ.find((item) => item.q === 'What are AI credits?')?.a;
      expect(answer).toContain('5 credits');
      expect(answer).toContain('an edit uses 1');
      expect(answer).toContain('1,000 a month');
      expect(answer).toContain('don’t roll over');
    });
  });
});
