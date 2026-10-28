import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ACCOUNT_API, AiUsage, Subscription } from '../../core/api/account.api';
import { BillingFacade } from '../../core/billing/billing.facade';
import { CHECKOUT_POLL_MS, CHECKOUT_POLL_TRIES, PlanSection } from './plan-section';

const subscription = (features: string[], granted: string[] = []): Subscription => ({
  plan: {
    code: 'pro',
    name: 'Pro',
    priceCents: 1900,
    currency: 'USD',
    limits: { maxWidgets: 10, maxVersionsPerWidget: 50, monthlyViews: 250_000, features },
  },
  status: 'active',
  currentPeriodStart: '2026-10-01T00:00:00.000Z',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  entitlements: {
    maxWidgets: 10,
    maxVersionsPerWidget: 50,
    monthlyViews: 250_000,
    aiCreditsPerMonth: 1000,
    features,
  },
  grantedFeatures: granted,
});

const usage = (used: number): AiUsage => ({
  used,
  limit: 1000,
  resetsAt: '2026-11-01T00:00:00.000Z',
  costs: { create: 5, regenerate: 5 },
});

async function render(sub: Subscription, ai: AiUsage | Error = usage(15)) {
  const api = {
    subscription: vi.fn(() => of(sub)),
    aiUsage: vi.fn(() => (ai instanceof Error ? throwError(() => ai) : of(ai))),
  };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: ACCOUNT_API, useValue: api }],
  });
  const fixture = TestBed.createComponent(PlanSection);
  fixture.detectChanges();
  await fixture.whenStable();
  // The meter is read after the subscription arrives: one more turn.
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, api };
}

describe('PlanSection: AI credits', () => {
  it('shows the meter on a paid plan with the assistant', async () => {
    const { el } = await render(subscription(['analytics', 'ai_assistant']));

    expect(el.textContent).toContain('AI credits');
    // The date follows the build's locale: "Nov 1" in en-US, "1 лист." in uk.
    expect(el.textContent).toMatch(/15 of 1,000 used · resets (Nov 1|1 Nov)/);
    const meter = el.querySelector('[role="meter"]')!;
    expect(meter.getAttribute('aria-valuenow')).toBe('15');
    expect(meter.getAttribute('aria-valuemax')).toBe('1000');
  });

  it('shows it on a free account that holds the assistant by grant', async () => {
    const { el } = await render(subscription(['ai_assistant'], ['ai_assistant']));

    expect(el.textContent).toContain('15 of 1,000 used');
  });

  it('marks the meter high from 80%', async () => {
    const { el } = await render(subscription(['ai_assistant']), usage(850));

    expect(el.querySelector('.ai-credits__fill--high')).not.toBeNull();
  });

  it('shows no row, and asks nothing, without the assistant', async () => {
    const { el, api } = await render(subscription(['analytics']));

    expect(el.textContent).not.toContain('AI credits');
    expect(api.aiUsage).not.toHaveBeenCalled();
  });

  it('still shows the plan when the meter cannot be read', async () => {
    const { el } = await render(subscription(['ai_assistant']), new Error('down'));

    expect(el.textContent).toContain('Pro');
    expect(el.textContent).not.toContain('AI credits');
  });
});

describe('PlanSection: billing', () => {
  const paid = (over: Partial<Subscription> = {}): Subscription => ({
    ...subscription(['analytics']),
    provider: 'stripe',
    manageable: true,
    ...over,
  });

  async function billingRender(
    sub: Subscription,
    options: { forSale?: boolean; query?: string; next?: Subscription[] } = {},
  ) {
    const queue = [...(options.next ?? [])];
    const api = {
      subscription: vi.fn(() => of(queue.length > 1 ? queue.shift()! : (queue[0] ?? sub))),
      aiUsage: vi.fn(() => of(usage(0))),
      plans: vi.fn(() => of([{ ...sub.plan, code: 'pro', purchasable: options.forSale ?? false }])),
    };
    const billing = { manage: vi.fn(() => Promise.resolve()) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ACCOUNT_API, useValue: api },
        { provide: BillingFacade, useValue: billing },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(options.query ? { checkout: options.query } : {}),
            },
          },
        },
      ],
    });
    // The first read is the page's own; queued answers are for the poll.
    if (options.next) api.subscription.mockReturnValueOnce(of(sub));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PlanSection);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, api, billing, navigate };
  }

  const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')];

  it('offers Manage billing on a Stripe-billed account', async () => {
    const { el, billing } = await billingRender(paid());

    const manage = buttons(el).find((b) => b.textContent?.includes('Manage billing'))!;
    manage.click();

    expect(billing.manage).toHaveBeenCalled();
  });

  it('links Upgrade to pricing while a plan is for sale', async () => {
    const free = { ...subscription([]), provider: 'internal' as const, manageable: false };
    const { el } = await billingRender(free, { forSale: true });

    const upgrade = el.querySelector('a.btn[href="/pricing"]');
    expect(upgrade?.textContent).toContain('Upgrade');
    expect(el.textContent).not.toContain('coming soon');
  });

  it('keeps Upgrade disabled as coming soon while nothing is for sale', async () => {
    const free = { ...subscription([]), provider: 'internal' as const, manageable: false };
    const { el } = await billingRender(free);

    const soon = buttons(el).find((b) => b.textContent?.includes('coming soon'))!;
    expect(soon.disabled).toBe(true);
  });

  it('warns when a renewal payment failed, with a way to update the card', async () => {
    const { el } = await billingRender(paid({ status: 'past_due' }));

    const alert = el.querySelector('.billing-alert')!;
    expect(alert.textContent).toContain('didn’t go through');
    expect(alert.querySelector('button')?.textContent).toContain('Update card');
  });

  it('says when a cancelled plan ends', async () => {
    const { el } = await billingRender(
      paid({ cancelAtPeriodEnd: true, currentPeriodEnd: '2026-11-27T00:00:00.000Z' }),
    );

    expect(el.querySelector('.plan-card__ends')?.textContent).toMatch(
      /ends on (November 27, 2026|27 листопада 2026)/,
    );
  });

  describe('back from checkout', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    async function tick(fixture: { detectChanges(): void }, times: number) {
      for (let i = 0; i < times; i++) {
        await vi.advanceTimersByTimeAsync(CHECKOUT_POLL_MS);
      }
      fixture.detectChanges();
    }

    it('waits for Stripe to confirm, then names the new plan', async () => {
      const free = { ...subscription([]), provider: 'internal' as const };
      const { fixture, el, navigate } = await billingRender(free, {
        query: 'done',
        next: [free, paid()],
      });

      expect(el.textContent).toContain('Confirming your payment');
      await tick(fixture, 2);

      expect(el.textContent).toContain('You’re on Pro');
      expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ replaceUrl: true }));
    });

    it('says the plan updates in a moment when the webhook is slow', async () => {
      const free = { ...subscription([]), provider: 'internal' as const };
      const { fixture, el } = await billingRender(free, { query: 'done', next: [free] });

      await tick(fixture, CHECKOUT_POLL_TRIES);

      expect(el.textContent).toContain('Payment received');
    });
  });
});

describe('PlanSection: changing, cancelling and the views notice', () => {
  const billedSub = (over: Partial<Subscription> = {}): Subscription => ({
    ...subscription(['analytics']),
    provider: 'paddle',
    interval: 'month',
    manageable: true,
    currentPeriodEnd: '2026-11-27T00:00:00.000Z',
    ...over,
  });

  const forSale = [
    { ...subscription([]).plan, code: 'pro', purchasable: true, intervals: ['month', 'year'] },
    {
      ...subscription([]).plan,
      code: 'growth',
      name: 'Growth',
      priceCents: 4900,
      annualPriceCents: 49000,
      purchasable: true,
      intervals: ['month', 'year'],
    },
  ];

  async function render(
    sub: Subscription,
    options: { params?: Record<string, string>; after?: Subscription } = {},
  ) {
    const api = {
      subscription: vi.fn(() => of(sub)),
      aiUsage: vi.fn(() => of(usage(0))),
      plans: vi.fn(() => of(forSale)),
    };
    const billing = {
      manage: vi.fn(() => Promise.resolve()),
      cancel: vi.fn(() => Promise.resolve()),
      resume: vi.fn(() => Promise.resolve()),
      changePlan: vi.fn(() => Promise.resolve()),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ACCOUNT_API, useValue: api },
        { provide: BillingFacade, useValue: billing },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(options.params ?? {}) } },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PlanSection);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    if (options.after) api.subscription.mockReturnValue(of(options.after));
    const el = fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
    const settle = async () => {
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, el, api, billing, button, settle };
  }

  it('offers Change plan, Manage billing and Cancel plan on a provider-billed account', async () => {
    const { button } = await render(billedSub());

    expect(button('Change plan')).toBeDefined();
    expect(button('Manage billing')).toBeDefined();
    expect(button('Cancel plan')).toBeDefined();
  });

  it('opens Change plan with every other plan and interval', async () => {
    const { el, button, fixture } = await render(billedSub());

    button('Change plan')!.click();
    fixture.detectChanges();

    const options = [...el.querySelectorAll<HTMLInputElement>('kit-change-plan input')];
    expect(options.map((o) => o.value)).toEqual(['pro:year', 'growth:month', 'growth:year']);
  });

  it('opens Change plan preselected when sent from pricing', async () => {
    const { el } = await render(billedSub(), {
      params: { changePlan: 'growth', interval: 'year' },
    });

    const checked = el.querySelector<HTMLInputElement>('kit-change-plan input:checked');
    expect(checked?.value).toBe('growth:year');
  });

  it('confirms before cancelling, saying when the plan ends', async () => {
    const { el, billing, button, fixture, settle } = await render(billedSub());

    button('Cancel plan')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="alertdialog"]')?.textContent).toMatch(
      /until (November 27, 2026|27 листопада 2026)/,
    );

    const confirm = [...el.querySelectorAll('[role="alertdialog"] button')].find(
      (b) => b.textContent?.trim() === 'Cancel plan',
    ) as HTMLButtonElement;
    confirm.click();
    await settle();

    expect(billing.cancel).toHaveBeenCalled();
    expect(el.textContent).toContain('Request sent');
  });

  it('offers Keep my plan while a cancellation is scheduled', async () => {
    const { billing, button, settle } = await render(billedSub({ cancelAtPeriodEnd: true }));

    expect(button('Cancel plan')).toBeUndefined();
    button('Keep my plan')!.click();
    await settle();

    expect(billing.resume).toHaveBeenCalled();
  });

  it('warns from 80% of the month’s views, offering Change plan', async () => {
    const { el } = await render(
      billedSub({
        usage: { widgets: 1, monthlyViews: 212_500, periodStart: '2026-10-01T00:00:00.000Z' },
      }),
    );

    const notice = el.querySelector('.notice--warning');
    expect(notice?.textContent).toContain('85% of this month’s views');
    expect(notice?.querySelector('button')?.textContent).toContain('Change plan');
  });

  it('says widgets keep showing at 100%, and links Upgrade on Free', async () => {
    const { el } = await render({
      ...subscription([]),
      provider: 'internal',
      entitlements: { ...subscription([]).entitlements, monthlyViews: 10_000 },
      usage: { widgets: 1, monthlyViews: 10_400, periodStart: '2026-10-01T00:00:00.000Z' },
    });

    const notice = el.querySelector('.notice--warning');
    expect(notice?.textContent).toContain('widgets keep showing');
    expect(notice?.querySelector('a[href="/pricing"]')).not.toBeNull();
  });

  it('shows no views notice under 80%', async () => {
    const { el } = await render(
      billedSub({
        usage: { widgets: 1, monthlyViews: 1_000, periodStart: '2026-10-01T00:00:00.000Z' },
      }),
    );

    expect(el.querySelector('.notice--warning')).toBeNull();
  });
});
