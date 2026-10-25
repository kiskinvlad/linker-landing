import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ACCOUNT_API, AiUsage, Subscription } from '../../core/api/account.api';
import { PlanSection } from './plan-section';

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
