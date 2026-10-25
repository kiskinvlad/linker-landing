import { ChangeDetectionStrategy, Component, LOCALE_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiUsage, Subscription } from '../../core/api/account.api';
import { AccountFacade } from '../../core/auth/account.facade';
import { featureName } from '../../core/billing/feature-names';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { describeError } from '../auth/auth-messages';

/**
 * Plan §10 "Plan & billing": the current plan and what it allows, read from
 * `GET /billing/subscription`. Read-only until paid plans exist.
 */
@Component({
  selector: 'kit-plan-section',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" aria-labelledby="plan-title">
      <h2 id="plan-title" i18n="@@account.plan.title">Plan &amp; billing</h2>

      @if (subscription(); as sub) {
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

        <div class="panel__actions">
          <button class="btn btn--ghost" type="button" disabled>
            <ng-container i18n="@@account.plan.upgrade">Upgrade · coming soon</ng-container>
          </button>
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

  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly error = signal<string | null>(null);
  /** This month's AI credits, on an account with the AI assistant; null otherwise or while unknown. */
  protected readonly aiUsage = signal<AiUsage | null>(null);

  constructor() {
    void this.load();
  }

  protected readonly feature = featureName;

  protected count(value: number): string {
    return this.numbers.format(value);
  }

  /** The reset is the first of a month in UTC: "1 Nov". */
  protected resetDate(usage: AiUsage): string {
    return this.dates.format(new Date(usage.resetsAt));
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

  /** The meter is extra: if it can't be read, the plan still shows without it. */
  private async loadAiUsage(): Promise<void> {
    try {
      this.aiUsage.set(await this.account.aiUsage());
    } catch {
      this.aiUsage.set(null);
    }
  }
}
