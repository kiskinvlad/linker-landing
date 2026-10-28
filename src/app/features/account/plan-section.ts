import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AiUsage, Plan, Subscription } from '../../core/api/account.api';
import { AccountFacade } from '../../core/auth/account.facade';
import { BillingFacade } from '../../core/billing/billing.facade';
import { featureName } from '../../core/billing/feature-names';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { describeError } from '../auth/auth-messages';
import { ChangePlan } from './change-plan';

/** How long the page waits for the provider's confirmation (D11). */
export const CHECKOUT_POLL_MS = 2_000;
export const CHECKOUT_POLL_TRIES = 10;

/**
 * Plan §10 "Plan & billing": the current plan and what it allows, read from
 * `GET /billing/subscription`, and paying for it (stripe-payments D8, D11):
 * - Upgrade while a plan is for sale;
 * - once the provider bills the account: Change plan, Cancel plan or Keep my
 *   plan, and Manage billing (the provider's portal: card and invoices);
 * - a notice at 80% and 100% of the month's views (D12).
 * The plan changes when the provider's webhook lands, not on a click or a
 * redirect, so after checkout (`?checkout=done`) and after a change the page
 * polls until it does.
 */
@Component({
  selector: 'kit-plan-section',
  imports: [RouterLink, ChangePlan],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" aria-labelledby="plan-title">
      <h2 id="plan-title" i18n="@@account.plan.title">Plan &amp; billing</h2>

      @switch (checkout()) {
        @case ('confirming') {
          <p class="notice" role="status" aria-busy="true" i18n="@@account.billing.confirming">
            Confirming your payment…
          </p>
        }
        @case ('done') {
          <p class="notice notice--success" role="status" i18n="@@account.billing.confirmed">
            You’re on {{ subscription()?.plan?.name }}. Thank you!
          </p>
        }
        @case ('slow') {
          <p class="notice" role="status" i18n="@@account.billing.slow">
            Payment received. Your plan updates in a moment; refresh this page if it hasn’t.
          </p>
        }
      }

      @if (subscription(); as sub) {
        @if (sub.status === 'past_due') {
          <div class="notice notice--warning billing-alert" role="alert">
            <p i18n="@@account.billing.pastDue">
              Your last payment didn’t go through. Update your card to keep {{ sub.plan.name }}.
            </p>
            @if (sub.manageable) {
              <button
                class="btn btn--primary"
                type="button"
                [disabled]="managing()"
                (click)="manage()"
                i18n="@@account.billing.updateCard"
              >
                Update card
              </button>
            }
          </div>
        }
        @if (viewsShare(); as share) {
          <div class="notice notice--warning billing-alert" role="status">
            <p>
              @if (share >= 100) {
                <ng-container i18n="@@account.views.full">
                  You’ve used this month’s {{ count(sub.entitlements.monthlyViews) }} views. Your
                  widgets keep showing; change your plan to match your traffic.
                </ng-container>
              } @else {
                <ng-container i18n="@@account.views.high">
                  You’ve used {{ share }}% of this month’s views.
                </ng-container>
              }
            </p>
            @if (billed()) {
              <button
                class="btn btn--ghost"
                type="button"
                (click)="openChange()"
                i18n="@@account.billing.changePlan"
              >
                Change plan
              </button>
            } @else if (forSale()) {
              <a class="btn btn--ghost" routerLink="/pricing" i18n="@@account.billing.upgrade"
                >Upgrade</a
              >
            }
          </div>
        }
        @if (pending()) {
          <p class="notice" role="status" aria-busy="true" i18n="@@account.billing.pending">
            Request sent. Your plan updates here in a moment.
          </p>
        }
        <div class="plan-card">
          <div class="plan-card__head">
            <p class="plan-card__name">{{ sub.plan.name }}</p>
            <span class="badge" [class.badge--ok]="sub.status === 'active'">
              @switch (sub.status) {
                @case ('active') {
                  <ng-container i18n="@@account.plan.status.active">Active</ng-container>
                }
                @case ('trialing') {
                  <ng-container i18n="@@account.plan.status.trialing">Trial</ng-container>
                }
                @case ('past_due') {
                  <ng-container i18n="@@account.plan.status.pastDue">Payment due</ng-container>
                }
                @case ('canceled') {
                  <ng-container i18n="@@account.plan.status.canceled">Canceled</ng-container>
                }
              }
            </span>
          </div>
          <dl class="plan-card__limits">
            <div>
              <dt i18n="@@account.plan.widgets">Live widgets</dt>
              <dd>{{ count(sub.entitlements.maxWidgets) }}</dd>
            </div>
            <div>
              <dt i18n="@@account.plan.views">Views a month</dt>
              <dd>{{ count(sub.entitlements.monthlyViews) }}</dd>
            </div>
            <div>
              <dt i18n="@@account.plan.versions">Saved versions per widget</dt>
              <dd>{{ count(sub.entitlements.maxVersionsPerWidget) }}</dd>
            </div>
            <div>
              <dt i18n="@@account.plan.analytics">Analytics</dt>
              <dd>
                @if (sub.entitlements.features.includes('analytics')) {
                  <ng-container i18n="@@account.plan.analyticsIncluded">Included</ng-container>
                } @else {
                  <ng-container i18n="@@account.plan.analyticsSample">Sample data</ng-container>
                }
              </dd>
            </div>
          </dl>
          @if (sub.cancelAtPeriodEnd && sub.currentPeriodEnd) {
            <p class="plan-card__ends" i18n="@@account.billing.endsOnKeep">
              Your plan ends on {{ longDate(sub.currentPeriodEnd) }}. Until then you can keep it.
            </p>
          }
          @if (aiUsage(); as ai) {
            <div class="ai-credits">
              <p id="ai-credits-label" class="ai-credits__label" i18n="@@account.plan.aiCredits">
                AI credits
              </p>
              <p class="ai-credits__value" i18n="@@account.plan.aiCreditsUsed">
                {{ count(ai.used) }} of {{ count(ai.limit) }} used · resets {{ resetDate(ai) }}
              </p>
              <div
                class="ai-credits__meter"
                role="meter"
                aria-labelledby="ai-credits-label"
                [attr.aria-valuemin]="0"
                [attr.aria-valuemax]="ai.limit"
                [attr.aria-valuenow]="ai.used"
              >
                <span
                  class="ai-credits__fill"
                  [class.ai-credits__fill--high]="ai.used >= ai.limit * 0.8"
                  [style.inline-size.%]="share(ai)"
                ></span>
              </div>
            </div>
          }
          <!-- Another app on this origin: a plain href, a full page load. -->
          <a
            class="plan-card__link"
            [href]="identity.analyticsPath"
            i18n="@@account.plan.openAnalytics"
            >Open analytics</a
          >
        </div>
        <h3 class="panel__sub" i18n="@@account.plan.unlockedTitle">
          Paid features unlocked by your ideas
        </h3>
        @if (sub.grantedFeatures?.length) {
          <ul class="unlocked">
            @for (key of sub.grantedFeatures; track key) {
              <li>
                <span>{{ feature(key) }}</span>
                <span class="badge badge--ok" i18n="@@account.plan.unlockedBadge"
                  >Free for you</span
                >
              </li>
            }
          </ul>
        } @else {
          <p class="panel__lead" i18n="@@account.plan.unlockedNone">
            None yet. <a routerLink="/feedback">Suggest an idea</a>: if it ships as a paid-plan
            feature, it’s unlocked here for free.
          </p>
        }
        <p class="field__hint" i18n="@@account.plan.limitsFollowPlan">
          Limits such as widgets, views and versions always follow your plan; ideas unlock features,
          never limits.
        </p>

        @if (billingError(); as message) {
          <p class="notice notice--error" role="alert">{{ message }}</p>
        }
        @if (confirmingCancel() && sub.currentPeriodEnd) {
          <div class="notice billing-alert" role="alertdialog" aria-labelledby="cancel-title">
            <p id="cancel-title" i18n="@@account.billing.cancelConfirm">
              Cancel your plan? You keep {{ sub.plan.name }} until
              {{ longDate(sub.currentPeriodEnd) }}, then the account moves to Free. Nothing you
              built is deleted.
            </p>
            <div class="panel__actions">
              <button
                class="btn btn--primary"
                type="button"
                [disabled]="acting()"
                (click)="cancelPlan()"
                i18n="@@account.billing.cancelYes"
              >
                Cancel plan
              </button>
              <button
                class="btn btn--ghost"
                type="button"
                (click)="confirmingCancel.set(false)"
                i18n="@@account.billing.cancelNo"
              >
                Keep it
              </button>
            </div>
          </div>
        }
        @if (changing()) {
          <kit-change-plan
            [plans]="plans()"
            [currentPlan]="sub.plan.code"
            [currentInterval]="sub.interval ?? null"
            [initial]="changeTo()"
            (changed)="afterChange()"
            (closed)="changing.set(false)"
          />
        }
        <div class="panel__actions">
          @if (billed()) {
            @if (sub.cancelAtPeriodEnd) {
              <button
                class="btn btn--primary"
                type="button"
                [disabled]="acting()"
                (click)="resumePlan()"
                i18n="@@account.billing.keep"
              >
                Keep my plan
              </button>
            } @else {
              <button
                class="btn btn--primary"
                type="button"
                (click)="openChange()"
                i18n="@@account.billing.changePlan"
              >
                Change plan
              </button>
            }
          }
          @if (sub.manageable) {
            <button
              class="btn btn--ghost"
              type="button"
              [disabled]="managing()"
              [attr.aria-busy]="managing()"
              (click)="manage()"
            >
              @if (managing()) {
                <ng-container i18n="@@account.billing.opening">Opening billing…</ng-container>
              } @else {
                <ng-container i18n="@@account.billing.manage">Manage billing</ng-container>
              }
            </button>
          }
          @if (billed()) {
            @if (!sub.cancelAtPeriodEnd) {
              <button
                class="btn btn--ghost"
                type="button"
                (click)="confirmingCancel.set(true)"
                i18n="@@account.billing.cancel"
              >
                Cancel plan
              </button>
            }
          } @else if (forSale()) {
            <a class="btn btn--primary" routerLink="/pricing" i18n="@@account.billing.upgrade"
              >Upgrade</a
            >
          } @else {
            <button class="btn btn--ghost" type="button" disabled>
              <ng-container i18n="@@account.plan.upgrade">Upgrade · coming soon</ng-container>
            </button>
          }
          <a routerLink="/pricing" i18n="@@account.plan.compare">Compare plans</a>
        </div>
      } @else if (error()) {
        <p class="notice notice--error" role="alert">{{ error() }}</p>
        <div class="panel__actions">
          <button class="btn btn--ghost" type="button" (click)="load()">
            <ng-container i18n="@@verify.confirm.retry">Try again</ng-container>
          </button>
        </div>
      } @else {
        <p class="panel__lead" aria-busy="true" i18n="@@account.loading">Loading…</p>
      }
    </section>
  `,
  styles: `
    .plan-card {
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
    }
    .plan-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .plan-card__name {
      font: 600 1.25rem var(--font-display);
      color: var(--ink);
    }
    .plan-card__ends {
      margin-block-start: 16px;
      color: var(--ink-2);
    }
    .billing-alert {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-block-end: 16px;
    }
    .plan-card__link {
      display: inline-block;
      margin-top: 16px;
      font-weight: 600;
    }
    .plan-card__limits {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin: 16px 0 0;
    }
    .plan-card__limits dt {
      color: var(--ink-3);
      font-size: 0.8125rem;
    }
    .unlocked {
      display: grid;
      gap: 8px;
      margin: 0 0 12px;
      padding: 0;
      list-style: none;
    }
    .unlocked li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg);
      color: var(--ink);
      font-weight: 600;
    }
    .ai-credits {
      margin-block-start: 16px;
    }
    .ai-credits__label {
      color: var(--ink-3);
      font-size: 0.8125rem;
    }
    .ai-credits__value {
      margin-block-start: 2px;
      color: var(--ink);
      font-weight: 600;
    }
    .ai-credits__meter {
      block-size: 6px;
      margin-block-start: 8px;
      overflow: hidden;
      border-radius: var(--radius-sm);
      background: var(--border);
    }
    .ai-credits__fill {
      display: block;
      block-size: 100%;
      background: var(--accent);
    }
    .ai-credits__fill--high {
      background: var(--warning);
    }
    .plan-card__limits dd {
      margin: 2px 0 0;
      color: var(--ink);
      font: 600 1.125rem var(--font-mono);
    }
  `,
})
export class PlanSection {
  private readonly account = inject(AccountFacade);
  private readonly billing = inject(BillingFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly identity = inject(APP_IDENTITY);

  /**
   * Intl rather than DecimalPipe: esbuild splits by module file, and any pipe from
   * @angular/common drags its formatting code into the shared chunk every
   * prerendered page loads. That cost the home page its LCP budget in CI.
   */
  private readonly locale = inject(LOCALE_ID);
  private readonly numbers = new Intl.NumberFormat(this.locale);
  private readonly dates = new Intl.DateTimeFormat(this.locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  private readonly longDates = new Intl.DateTimeFormat(this.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly error = signal<string | null>(null);
  /** This month's AI credits, on an account with the AI assistant; null otherwise or while unknown. */
  protected readonly aiUsage = signal<AiUsage | null>(null);
  /** The plans this server sells (`purchasable`), for Upgrade and Change plan. */
  protected readonly plans = signal<Plan[]>([]);
  protected readonly forSale = computed(() => this.plans().length > 0);
  /** A payment provider bills the account: it changes and cancels here. */
  protected readonly billed = computed(() => {
    const provider = this.subscription()?.provider;
    return provider === 'paddle' || provider === 'stripe';
  });
  /** This month's views as a share of the plan, from 80% on; null below. */
  protected readonly viewsShare = computed(() => {
    const sub = this.subscription();
    const limit = sub?.entitlements.monthlyViews ?? 0;
    const used = sub?.usage?.monthlyViews ?? 0;
    if (!limit || used < limit * 0.8) return null;
    return Math.floor((used / limit) * 100);
  });
  /** Back from checkout: waiting for the webhook, then confirmed or still pending. */
  protected readonly checkout = signal<'confirming' | 'done' | 'slow' | null>(null);
  protected readonly managing = signal(false);
  protected readonly billingError = signal<string | null>(null);
  protected readonly changing = signal(false);
  /** Preselected in Change plan, e.g. `growth:month` from Upgrade on pricing. */
  protected readonly changeTo = signal<string | null>(null);
  protected readonly confirmingCancel = signal(false);
  /** A change, cancel or resume is being sent. */
  protected readonly acting = signal(false);
  /** Sent; waiting for the provider's webhook to show it. */
  protected readonly pending = signal(false);

  constructor() {
    void this.load();
    void this.loadPlans();
    const query = this.route.snapshot.queryParamMap;
    if (query.get('checkout') === 'done') void this.confirmCheckout();
    const wanted = query.get('changePlan');
    if (wanted) {
      this.changeTo.set(`${wanted}:${query.get('interval') === 'year' ? 'year' : 'month'}`);
      this.changing.set(true);
    }
  }

  protected readonly feature = featureName;

  protected count(value: number): string {
    return this.numbers.format(value);
  }

  /** The reset is the first of a month in UTC: "1 Nov". */
  protected resetDate(usage: AiUsage): string {
    return this.dates.format(new Date(usage.resetsAt));
  }

  protected longDate(iso: string): string {
    return this.longDates.format(new Date(iso));
  }

  /** Off to the provider's customer portal: card and invoices. */
  protected async manage(): Promise<void> {
    this.billingError.set(null);
    this.managing.set(true);
    try {
      await this.billing.manage();
    } catch (e) {
      this.managing.set(false);
      this.billingError.set(describeError(e));
    }
  }

  protected openChange(): void {
    this.confirmingCancel.set(false);
    this.changing.set(true);
  }

  /** Change plan was accepted by the provider: wait for its webhook. */
  protected afterChange(): void {
    const before = this.subscription();
    this.changing.set(false);
    void this.waitForUpdate(
      (sub) => sub.plan.code !== before?.plan.code || sub.interval !== before?.interval,
    );
  }

  protected async cancelPlan(): Promise<void> {
    await this.act(
      () => this.billing.cancel(),
      (sub) => sub.cancelAtPeriodEnd,
    );
    this.confirmingCancel.set(false);
  }

  protected async resumePlan(): Promise<void> {
    await this.act(
      () => this.billing.resume(),
      (sub) => !sub.cancelAtPeriodEnd,
    );
  }

  protected share(usage: AiUsage): number {
    return usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  }

  protected async load(): Promise<void> {
    this.error.set(null);
    try {
      const subscription = await this.account.subscription();
      this.subscription.set(subscription);
      if (subscription.entitlements.features.includes('ai_assistant')) void this.loadAiUsage();
    } catch (e) {
      this.error.set(describeError(e));
    }
  }

  /** Extra too: without it the button just says "coming soon". */
  private async loadPlans(): Promise<void> {
    try {
      this.plans.set(
        (await this.account.plans()).filter((plan) => plan.purchasable && plan.priceCents > 0),
      );
    } catch {
      this.plans.set([]);
    }
  }

  /** Sends a change to the provider, then waits for its webhook to show it. */
  private async act(
    send: () => Promise<void>,
    done: (subscription: Subscription) => boolean,
  ): Promise<void> {
    this.billingError.set(null);
    this.acting.set(true);
    try {
      await send();
      void this.waitForUpdate(done);
    } catch (e) {
      this.billingError.set(describeError(e));
    } finally {
      this.acting.set(false);
    }
  }

  /**
   * Polls the subscription until `done` holds, for at most
   * `CHECKOUT_POLL_TRIES` × `CHECKOUT_POLL_MS`. True when it did.
   */
  private async poll(done: (subscription: Subscription) => boolean): Promise<boolean> {
    for (let attempt = 0; attempt < CHECKOUT_POLL_TRIES; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, CHECKOUT_POLL_MS));
      try {
        const subscription = await this.account.subscription();
        if (done(subscription)) {
          this.subscription.set(subscription);
          if (subscription.entitlements.features.includes('ai_assistant')) {
            void this.loadAiUsage();
          }
          return true;
        }
      } catch {
        // A blip while waiting: try again on the next tick.
      }
    }
    return false;
  }

  private async waitForUpdate(done: (subscription: Subscription) => boolean): Promise<void> {
    this.pending.set(true);
    await this.poll(done);
    this.pending.set(false);
  }

  /**
   * After checkout: waits until the provider bills the account, then drops
   * the query so a reload doesn't wait again.
   */
  private async confirmCheckout(): Promise<void> {
    this.checkout.set('confirming');
    const paid = await this.poll(
      (subscription) => !!subscription.provider && subscription.provider !== 'internal',
    );
    this.checkout.set(paid ? 'done' : 'slow');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { checkout: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** The meter is extra: if it can't be read, the plan still shows without it. */
  private async loadAiUsage(): Promise<void> {
    try {
      this.aiUsage.set(await this.account.aiUsage());
    } catch {
      this.aiUsage.set(null);
    }
  }
}
