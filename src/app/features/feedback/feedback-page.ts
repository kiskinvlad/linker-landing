import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeedbackItem } from '../../core/api/feedback.api';
import { SessionStore } from '../../core/auth/session.store';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { FeedbackFacade } from '../../core/feedback/feedback.facade';
import { describeError } from '../auth/auth-messages';
import { FeedbackForm } from './feedback-form';
import { MyIdeas } from './my-ideas';

/**
 * /feedback (plan §10a): the Feedback Program's rules, the form and "Your ideas".
 *
 * Prerendered, so the hero and the rules are real HTML for crawlers; the form and
 * the list depend on the session, which the build can't see, so the static page
 * holds a placeholder until `/auth/me` answers. Sending needs a signed-in,
 * verified account (every reward needs an owner); the page says which step is
 * missing instead of hiding the form behind a guard.
 */
@Component({
  selector: 'kit-feedback-page',
  imports: [RouterLink, FeedbackForm, MyIdeas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-hero">
      <div class="container">
        <p class="eyebrow" i18n="@@cocreate.eyebrow">Build {{ identity.productName }} with us</p>
        <h1 i18n="@@feedback.title">Suggest an idea</h1>
        <p i18n="@@feedback.lead">
          A feature you’re missing, something that could work better, or a bug. If your idea ships
          as a paid-plan feature, it’s unlocked on your account for free.
        </p>
      </div>
    </header>

    <section class="section feedback">
      <div class="container feedback__layout">
        <aside class="feedback__rules" aria-labelledby="feedback-rules-title">
          <h2 id="feedback-rules-title" i18n="@@feedback.rules.title">How the reward works</h2>
          <ul>
            <li i18n="@@feedback.rules.unlock">
              <strong>Paid-plan feature?</strong> If we ship your idea as part of a paid plan, it’s
              unlocked on your account for free, on any plan, while your account is active.
            </li>
            <li i18n="@@feedback.rules.thanks">
              <strong>Everything else</strong> (a Free feature, an improvement, a bug fix) reaches
              everyone, and you get a “Shipped · thank you”.
            </li>
            <li i18n="@@feedback.rules.limits">
              <strong>Limits follow your plan.</strong> Widgets, views and versions are never
              unlocked through ideas.
            </li>
            <li i18n="@@feedback.rules.duplicates">
              <strong>Same idea twice?</strong> Everyone who sent it before we approved it gets the
              same reward.
            </li>
          </ul>
          <a routerLink="/legal/feedback-program" i18n="@@feedback.rules.full"
            >Read the full program rules</a
          >
        </aside>

        <div class="feedback__main">
          <section class="panel" aria-labelledby="feedback-form-title">
            <h2 id="feedback-form-title" i18n="@@feedback.form.heading">Your idea</h2>
            @switch (state()) {
              @case ('anonymous') {
                <p class="panel__lead" i18n="@@feedback.signIn.lead">
                  Ideas are tied to your account, so the reward has an owner. Log in or create a
                  free account to send one.
                </p>
                <div class="panel__actions">
                  <a
                    class="btn btn--primary"
                    routerLink="/login"
                    [queryParams]="{ returnUrl: '/feedback' }"
                    i18n="@@nav.login"
                    >Log in</a
                  >
                  <a
                    class="btn btn--ghost"
                    routerLink="/register"
                    [queryParams]="{ returnUrl: '/feedback' }"
                    i18n="@@nav.signup"
                    >Sign up</a
                  >
                </div>
              }
              @case ('unverified') {
                <p class="notice notice--warning" role="status">
                  <ng-container i18n="@@feedback.verify.lead"
                    >Confirm your email address to send ideas.</ng-container
                  >
                  <a routerLink="/verify-email" i18n="@@account.verifyLink">Resend the link</a>
                </p>
              }
              @case ('ready') {
                <kit-feedback-form (created)="prepend($event)" />
              }
              @default {
                <p class="panel__lead" aria-busy="true" i18n="@@account.loading">Loading…</p>
              }
            }
          </section>

          @if (state() === 'ready' || state() === 'unverified') {
            <section class="panel" aria-labelledby="feedback-mine-title">
              <h2 id="feedback-mine-title" i18n="@@feedback.ideas.title">Your ideas</h2>
              <kit-my-ideas [items]="ideas()" [error]="ideasError()" (retry)="load()" />
            </section>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .feedback {
      padding-top: 0;
    }
    .feedback__layout {
      display: grid;
      grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
      gap: 40px;
      align-items: start;
    }
    .feedback__rules {
      position: sticky;
      top: 96px;
      padding: 24px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--bg-2);
    }
    .feedback__rules h2 {
      font-size: 1.125rem;
    }
    .feedback__rules ul {
      display: grid;
      gap: 12px;
      margin: 16px 0 20px;
      padding-left: 18px;
      color: var(--ink-2);
      font-size: 0.9375rem;
    }
    .feedback__rules strong {
      color: var(--ink);
    }
    .feedback__main {
      display: grid;
      gap: 24px;
      min-width: 0;
    }
    @media (max-width: 860px) {
      .feedback__layout {
        grid-template-columns: minmax(0, 1fr);
        gap: 24px;
      }
      .feedback__rules {
        position: static;
      }
    }
  `,
})
export class FeedbackPage {
  protected readonly identity = inject(APP_IDENTITY);
  private readonly session = inject(SessionStore);
  private readonly feedback = inject(FeedbackFacade);

  protected readonly ideas = signal<FeedbackItem[] | null>(null);
  protected readonly ideasError = signal<string | null>(null);

  /** `unknown` on the prerendered page and until `/auth/me` answers. */
  protected readonly state = computed((): 'unknown' | 'anonymous' | 'unverified' | 'ready' => {
    const status = this.session.status();
    if (status !== 'authenticated') return status;
    return this.session.user()?.emailVerified ? 'ready' : 'unverified';
  });

  constructor() {
    // Load "Your ideas" once someone is signed in: on arrival, or after the session
    // check that runs on startup without blocking the page.
    effect(() => {
      const signedIn = this.session.isAuthenticated();
      untracked(() => {
        if (signedIn) void this.load();
        else this.ideas.set(null);
      });
    });
  }

  protected async load(): Promise<void> {
    this.ideasError.set(null);
    try {
      this.ideas.set(await this.feedback.mine());
    } catch (e) {
      this.ideasError.set(describeError(e));
    }
  }

  protected prepend(item: FeedbackItem): void {
    this.ideas.update((list) => [item, ...(list ?? [])]);
  }
}
