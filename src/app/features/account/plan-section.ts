import { ChangeDetectionStrategy, Component, LOCALE_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from '../../core/api/account.api';
import { AccountFacade } from '../../core/auth/account.facade';
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
          </dl>
        </div>
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
    .plan-card__limits dd {
      margin: 2px 0 0;
      color: var(--ink);
      font: 600 1.125rem var(--font-mono);
    }
  `,
})
export class PlanSection {
  private readonly account = inject(AccountFacade);

  /**
   * Intl rather than DecimalPipe: esbuild splits by module file, and any pipe from
   * @angular/common drags its formatting code into the shared chunk every
   * prerendered page loads. That cost the home page its LCP budget in CI.
   */
  private readonly numbers = new Intl.NumberFormat(inject(LOCALE_ID));

  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  protected count(value: number): string {
    return this.numbers.format(value);
  }

  protected async load(): Promise<void> {
    this.error.set(null);
    try {
      this.subscription.set(await this.account.subscription());
    } catch (e) {
      this.error.set(describeError(e));
    }
  }
}
