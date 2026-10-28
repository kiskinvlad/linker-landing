import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { BillingInterval, Plan } from '../../core/api/account.api';
import { BillingFacade } from '../../core/billing/billing.facade';
import { describeError } from '../auth/auth-messages';

/** One plan at one billing interval: what Change plan offers. */
interface Option {
  key: string;
  plan: Plan;
  interval: BillingInterval;
  price: string;
}

/**
 * Change plan for an account the provider bills (stripe-payments D8, D11):
 * every purchasable plan × interval except the current one. The provider
 * prorates the difference now; the account page then waits for the webhook
 * to move the plan.
 */
@Component({
  selector: 'kit-change-plan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="change-plan" (submit)="$event.preventDefault(); submit()">
      <fieldset>
        <legend i18n="@@account.changePlan.legend">Change plan</legend>
        @for (option of options(); track option.key) {
          <label class="change-plan__option">
            <input
              type="radio"
              name="plan"
              [value]="option.key"
              [checked]="selected() === option.key"
              (change)="chosen.set(option.key)"
            />
            <span class="change-plan__name">{{ option.plan.name }}</span>
            <span class="change-plan__price">
              {{ option.price }}
              @if (option.interval === 'year') {
                <ng-container i18n="@@plans.paid.perYear">/ year</ng-container>
              } @else {
                <ng-container i18n="@@plans.paid.period">/ month</ng-container>
              }
            </span>
          </label>
        }
      </fieldset>
      <p class="field__hint" i18n="@@account.changePlan.prorated">
        You’re charged or credited the prorated difference today. Tax is included or added depending
        on your country.
      </p>
      @if (error(); as message) {
        <p class="notice notice--error" role="alert">{{ message }}</p>
      }
      <div class="panel__actions">
        <button
          class="btn btn--primary"
          type="submit"
          [disabled]="!selected() || busy()"
          [attr.aria-busy]="busy()"
          i18n="@@account.changePlan.submit"
        >
          Change plan
        </button>
        <button
          class="btn btn--ghost"
          type="button"
          (click)="closed.emit()"
          i18n="@@account.changePlan.cancel"
        >
          Not now
        </button>
      </div>
    </form>
  `,
  styles: `
    .change-plan {
      margin-block-start: 16px;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
    }
    fieldset {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      margin-block-end: 8px;
      font-weight: 600;
      color: var(--ink);
    }
    .change-plan__option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      cursor: pointer;
    }
    .change-plan__name {
      font-weight: 600;
      color: var(--ink);
    }
    .change-plan__price {
      margin-inline-start: auto;
      color: var(--ink-2);
      font-family: var(--font-mono);
    }
  `,
})
export class ChangePlan {
  private readonly billing = inject(BillingFacade);
  private readonly locale = inject(LOCALE_ID);

  /** The plans this server sells. */
  readonly plans = input.required<Plan[]>();
  /** The account's plan and interval, left out of the choices. */
  readonly currentPlan = input<string | null>(null);
  readonly currentInterval = input<BillingInterval | null>(null);
  /** Preselected, e.g. from Upgrade on the pricing page: `growth:month`. */
  readonly initial = input<string | null>(null);

  readonly changed = output<void>();
  readonly closed = output<void>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  /** A choice made in the form, over the preselection. */
  protected readonly chosen = signal<string | null>(null);

  protected readonly options = computed<Option[]>(() =>
    this.plans().flatMap((plan) =>
      (plan.intervals ?? [])
        .filter(
          (interval) => !(plan.code === this.currentPlan() && interval === this.currentInterval()),
        )
        .map((interval) => ({
          key: `${plan.code}:${interval}`,
          plan,
          interval,
          price: this.price(plan, interval),
        })),
    ),
  );

  protected readonly selected = computed(() => {
    const keys = this.options().map((option) => option.key);
    const wanted = this.chosen() ?? this.initial();
    return wanted && keys.includes(wanted) ? wanted : null;
  });

  protected async submit(): Promise<void> {
    const option = this.options().find((o) => o.key === this.selected());
    if (!option) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.billing.changePlan(option.plan.code, option.interval);
      this.changed.emit();
    } catch (e) {
      this.error.set(describeError(e));
    } finally {
      this.busy.set(false);
    }
  }

  private price(plan: Plan, interval: BillingInterval): string {
    const cents = interval === 'year' ? (plan.annualPriceCents ?? 0) : plan.priceCents;
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: plan.currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  }
}
