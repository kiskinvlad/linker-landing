import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Plan } from '../../core/api/account.api';
import { ApiError } from '../../core/api/api-error';
import { BillingFacade } from '../../core/billing/billing.facade';
import { ChangePlan } from './change-plan';

const plan = (code: string, name: string, priceCents: number): Plan => ({
  code,
  name,
  priceCents,
  annualPriceCents: priceCents * 10,
  currency: 'USD',
  limits: { maxWidgets: 1, maxVersionsPerWidget: 1, monthlyViews: 1, features: [] },
  purchasable: true,
  intervals: ['month', 'year'],
});

@Component({
  imports: [ChangePlan],
  template: `<kit-change-plan
    [plans]="plans"
    currentPlan="pro"
    currentInterval="month"
    [initial]="initial()"
    (changed)="changed = changed + 1"
    (closed)="closed = closed + 1"
  />`,
})
class Host {
  plans = [plan('pro', 'Pro', 1900), plan('growth', 'Growth', 4900)];
  initial = signal<string | null>(null);
  changed = 0;
  closed = 0;
}

async function render(changePlan: () => Promise<void> = () => Promise.resolve()) {
  const billing = { changePlan: vi.fn(changePlan) };
  TestBed.configureTestingModule({ providers: [{ provide: BillingFacade, useValue: billing }] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const radios = () => [...el.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, billing, radios, submit };
}

describe('ChangePlan', () => {
  it('offers every plan and interval except the current one, with yearly prices', async () => {
    const { el, radios } = await render();

    expect(radios().map((r) => r.value)).toEqual(['pro:year', 'growth:month', 'growth:year']);
    expect(el.textContent).toContain('$190');
    expect(el.textContent).toContain('prorated difference');
  });

  it('starts from the plan chosen on the pricing page', async () => {
    const { fixture, radios } = await render();
    fixture.componentInstance.initial.set('growth:month');
    fixture.detectChanges();

    expect(radios().find((r) => r.checked)?.value).toBe('growth:month');
  });

  it('sends the chosen plan and interval, then reports the change', async () => {
    const { fixture, billing, radios, submit } = await render();

    radios()[2]!.click();
    fixture.detectChanges();
    await submit();

    expect(billing.changePlan).toHaveBeenCalledWith('growth', 'year');
    expect(fixture.componentInstance.changed).toBe(1);
  });

  it('shows a refusal and stays open', async () => {
    const { fixture, el, radios, submit } = await render(() =>
      Promise.reject(
        new ApiError(400, 'This plan is not for sale.', [], null, 'PLAN_NOT_PURCHASABLE'),
      ),
    );

    radios()[1]!.click();
    fixture.detectChanges();
    await submit();

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.componentInstance.changed).toBe(0);
  });
});
