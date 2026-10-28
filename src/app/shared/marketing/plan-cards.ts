import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BillingInterval, Plan } from '../../core/api/account.api';
import { ApiError } from '../../core/api/api-error';
import { AccountFacade } from '../../core/auth/account.facade';
import { AuthFacade } from '../../core/auth/auth.facade';
import { SessionStore } from '../../core/auth/session.store';
import { BillingFacade } from '../../core/billing/billing.facade';
import { describeError } from '../../features/auth/auth-messages';
import { RevealDirective } from '../ui/reveal.directive';
import { FREE_PLAN, PAID_PLAN_EXTRAS, PRO_PLAN } from './plans.content';

/**
 * Free, and either "Pro — coming soon" or the paid plans this server sells,
 * monthly or yearly, used by /pricing (stripe-payments D11).
 *
 * The prerendered page always shows "Coming soon": whether a plan is for sale
 * is the API's `purchasable`, read in the browser. Upgrade sends a signed-in
 * account to checkout, an account already paying to Change plan, and anyone
 * else to sign up first.
 */
@Component({
  selector: 'kit-plan-cards',
  imports: [RouterLink, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (yearly()) {
      <div
        class="plans__interval"
        role="group"
        i18n-aria-label="@@plans.interval.label"
        aria-label="Billing period"
      >
        <button
          type="button"
          class="plans__interval-option"
          [attr.aria-pressed]="interval() === 'month'"
          (click)="interval.set('month')"
          i18n="@@plans.interval.month"
        >
          Monthly
        </button>
        <button
          type="button"
          class="plans__interval-option"
          [attr.aria-pressed]="interval() === 'year'"
          (click)="interval.set('year')"
        >
          <ng-container i18n="@@plans.interval.year">Yearly</ng-container>
          <span class="plans__interval-save" i18n="@@plans.interval.save">2 months free</span>
        </button>
      </div>
    }
    <div
      class="plans"
      [class.plans--three]="forSale().length === 2"
      [class.plans--four]="forSale().length > 2"
    >
      <article class="plan plan--free" kitReveal aria-labelledby="plan-free">
        <p class="plan__badge" i18n="@@plans.badge.now">Available now</p>
        <h3 id="plan-free">{{ free.name }}</h3>
        <p class="plan__price">
          {{ free.price }} <span i18n="@@plans.free.period">/ forever</span>
        </p>
        <ul class="plan__features">
          @for (f of free.features; track f) {
            <li>{{ f }}</li>
          }
        </ul>
        <a
          class="btn btn--primary plan__cta"
          routerLink="/register"
          [queryParams]="{ plan: 'free' }"
          i18n="@@cta.startFree"
          >Start free</a
        >
        <p class="plan__note" i18n="@@plans.free.note">No credit card needed</p>
      </article>

      @for (plan of forSale(); track plan.code; let i = $index) {
        <article
          class="plan plan--paid"
          [kitReveal]="120 + i * 80"
          [attr.aria-labelledby]="'plan-' + plan.code"
        >
          <h3 [id]="'plan-' + plan.code">{{ plan.name }}</h3>
          <p class="plan__price">
            {{ price(plan) }}
            @if (billedYearly(plan)) {
              <span i18n="@@plans.paid.perYear">/ year</span>
            } @else {
              <span i18n="@@plans.paid.period">/ month</span>
            }
          </p>
          <p class="plan__tax" i18n="@@plans.paid.tax">Plus tax where it applies</p>
          <ul class="plan__features">
            <li i18n="@@plans.paid.widgets">
              {plan.limits.maxWidgets, plural,
                =1 {1 live widget}
                other {{{ count(plan.limits.maxWidgets) }} live widgets}
              }
            </li>
            <li i18n="@@plans.paid.views">
              {{ count(plan.limits.monthlyViews) }} widget views a month
            </li>
            <li i18n="@@plans.paid.versions">
              {plan.limits.maxVersionsPerWidget, plural,
                =1 {1 saved version per widget}
                other {{{ count(plan.limits.maxVersionsPerWidget) }} saved versions per widget}
              }
            </li>
            @if (plan.limits.aiCreditsPerMonth) {
              <li i18n="@@plans.paid.ai">
                AI assistant: {{ count(plan.limits.aiCreditsPerMonth) }} credits a month
              </li>
            }
            @for (f of extras(plan); track f) {
              <li>{{ f }}</li>
            }
          </ul>
          <button
            class="btn plan__cta"
            [class.btn--primary]="i === 0"
            [class.btn--ghost]="i !== 0"
            type="button"
            [disabled]="busy() !== null"
            [attr.aria-busy]="busy() === plan.code"
            (click)="upgrade(plan)"
          >
            @if (busy() === plan.code) {
              <ng-container i18n="@@plans.paid.opening">Opening checkout…</ng-container>
            } @else {
              <ng-container i18n="@@plans.paid.upgrade">Upgrade to {{ plan.name }}</ng-container>
            }
          </button>
          <p class="plan__note" i18n="@@plans.paid.note">Cancel any time</p>
        </article>
      } @empty {
        <article class="plan plan--pro" [kitReveal]="120" aria-labelledby="plan-pro">
          <p class="plan__badge plan__badge--soon" i18n="@@plans.badge.soon">Coming soon</p>
          <h3 id="plan-pro">{{ pro.name }}</h3>
          <p class="plan__lead">{{ pro.lead }}</p>
          <ul class="plan__features plan__features--muted">
            @for (f of pro.features; track f) {
              <li>{{ f }}</li>
            }
          </ul>
        </article>
      }
    </div>
    @if (error(); as message) {
      <p class="notice notice--error plans__error" role="alert">
        {{ message }}
        @if (termsMissing()) {
          <a routerLink="/account" i18n="@@plans.paid.openAccount">Open your account</a>
        }
      </p>
    }
  `,
  styleUrl: './plan-cards.css',
})
export class PlanCards {
  private readonly account = inject(AccountFacade);
  private readonly auth = inject(AuthFacade);
  private readonly session = inject(SessionStore);
  private readonly billing = inject(BillingFacade);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);
  private readonly numbers = new Intl.NumberFormat(this.locale);

  protected readonly free = FREE_PLAN;
  protected readonly pro = PRO_PLAN;
  /** The paid plans this server sells, cheapest first; empty until known. */
  protected readonly forSale = signal<Plan[]>([]);
  /** Shown prices and what Upgrade buys. */
  protected readonly interval = signal<BillingInterval>('month');
  /** Some plan is sold yearly: offer the switch. */
  protected readonly yearly = computed(() =>
    this.forSale().some((plan) => plan.intervals?.includes('year')),
  );
  /** The plan whose checkout is opening. */
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly termsMissing = signal(false);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) void this.load();
  }

  protected count(value: number): string {
    return this.numbers.format(value);
  }

  /** Yearly when chosen and the plan is sold yearly; otherwise monthly. */
  protected billedYearly(plan: Plan): boolean {
    return this.interval() === 'year' && !!plan.intervals?.includes('year');
  }

  protected price(plan: Plan): string {
    const cents = this.billedYearly(plan) ? (plan.annualPriceCents ?? 0) : plan.priceCents;
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: plan.currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  }

  protected extras(plan: Plan): readonly string[] {
    return PAID_PLAN_EXTRAS[plan.code] ?? [];
  }

  protected async upgrade(plan: Plan): Promise<void> {
    this.error.set(null);
    this.termsMissing.set(false);
    const interval: BillingInterval = this.billedYearly(plan) ? 'year' : 'month';
    await this.auth.ensureKnown();
    if (!this.session.isAuthenticated()) {
      await this.router.navigate(['/register'], {
        queryParams: { plan: plan.code, returnUrl: '/pricing' },
      });
      return;
    }
    this.busy.set(plan.code);
    try {
      // On success the browser leaves for checkout; the button stays busy until then.
      await this.billing.checkout(plan.code, interval);
    } catch (e) {
      this.busy.set(null);
      const code = ApiError.from(e).code;
      if (code === 'ALREADY_SUBSCRIBED') {
        // Already paying: the plan changes from the account page, prorated.
        await this.router.navigate(['/account'], {
          queryParams: { changePlan: plan.code, interval },
        });
      } else if (code === 'EMAIL_NOT_VERIFIED') {
        await this.router.navigate(['/verify-email'], { queryParams: { returnUrl: '/pricing' } });
      } else if (code === 'TERMS_NOT_ACCEPTED') {
        this.termsMissing.set(true);
        this.error.set(
          $localize`:@@plans.paid.termsMissing:Accept the current Terms of Service in your account, then upgrade.`,
        );
      } else {
        this.error.set(describeError(e));
      }
    }
  }

  /** Nothing for sale, or no API: the "Coming soon" card stays. */
  private async load(): Promise<void> {
    try {
      const plans = await this.account.plans();
      this.forSale.set(
        plans
          .filter((plan) => plan.purchasable && plan.priceCents > 0)
          .sort((a, b) => a.priceCents - b.priceCents),
      );
    } catch {
      this.forSale.set([]);
    }
  }
}
