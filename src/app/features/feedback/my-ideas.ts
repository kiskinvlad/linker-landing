import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  inject,
  input,
  output,
} from '@angular/core';
import { FeedbackItem } from '../../core/api/feedback.api';
import { featureName } from '../../core/billing/feature-names';
import { AREA_LABELS, KIND_LABELS, statusView } from './feedback.content';

/**
 * "Your ideas" on /feedback (plan §10a): every idea the signed-in user sent, newest
 * first, with the status the Feedback Program publishes. Read-only: the API has no
 * route to edit or withdraw an idea.
 */
@Component({
  selector: 'kit-my-ideas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <p class="notice notice--error" role="alert">{{ error() }}</p>
      <div class="panel__actions">
        <button class="btn btn--ghost" type="button" (click)="retry.emit()">
          <ng-container i18n="@@verify.confirm.retry">Try again</ng-container>
        </button>
      </div>
    } @else if (items(); as items) {
      @if (items.length) {
        <ul class="ideas">
          @for (item of items; track item.id) {
            @let status = statusOf(item);
            <li class="idea">
              <div class="idea__head">
                <p class="idea__title">{{ item.title }}</p>
                <span class="badge" [class.badge--ok]="status.tone === 'ok'">{{
                  status.label
                }}</span>
              </div>
              <p class="idea__meta">
                {{ kindLabels[item.kind] }} · {{ areaLabels[item.area] }} ·
                <time [attr.datetime]="item.createdAt">{{ date(item.createdAt) }}</time>
              </p>
              @if (item.featureKey && (item.status === 'approved' || item.status === 'shipped')) {
                <p class="idea__feature">
                  <ng-container i18n="@@feedback.ideas.feature">Feature:</ng-container>
                  {{ feature(item.featureKey) }}
                </p>
              }
            </li>
          }
        </ul>
      } @else {
        <p class="panel__lead" i18n="@@feedback.ideas.empty">
          You haven’t sent any ideas yet. They’ll appear here with their status.
        </p>
      }
    } @else {
      <p class="panel__lead" aria-busy="true" i18n="@@account.loading">Loading…</p>
    }
  `,
  styles: `
    .ideas {
      display: grid;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .idea {
      padding: 16px 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
    }
    .idea__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .idea__title {
      min-width: 0;
      color: var(--ink);
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .idea__head .badge {
      flex: none;
    }
    .idea__meta,
    .idea__feature {
      margin-top: 6px;
      color: var(--ink-3);
      font-size: 0.875rem;
    }
    .idea__feature {
      color: var(--ink-2);
    }
  `,
})
export class MyIdeas {
  /** `null` while loading. */
  readonly items = input<FeedbackItem[] | null>(null);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();

  protected readonly kindLabels = KIND_LABELS;
  protected readonly areaLabels = AREA_LABELS;
  protected readonly statusOf = statusView;
  protected readonly feature = featureName;

  /** Intl rather than DatePipe: see PlanSection on why pipes stay out of the shared chunk. */
  private readonly dates = new Intl.DateTimeFormat(inject(LOCALE_ID), { dateStyle: 'medium' });

  protected date(iso: string): string {
    return this.dates.format(new Date(iso));
  }
}
