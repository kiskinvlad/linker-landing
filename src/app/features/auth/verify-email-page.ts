import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthFacade } from '../../core/auth/auth.facade';
import { ReturnNavigator } from '../../core/auth/auth.guards';
import { SessionStore } from '../../core/auth/session.store';
import { describeError } from './auth-messages';

/** Plan §10: Resend waits this long, so a double click can't burn the API's 5-per-15-minutes. */
const RESEND_COOLDOWN_S = 60;

/**
 * "Check your inbox" (plan §10), for a signed-in visitor whose address is not
 * confirmed yet. Registration lands here, and so does anyone headed for the
 * editor unverified; `returnUrl` is where they continue once confirmed.
 *
 * The link itself is opened elsewhere (/verify-email/confirm, often on another
 * device), so this page re-asks the API whenever the tab regains focus: switch
 * back after clicking the link and it moves on by itself.
 */
@Component({
  selector: 'kit-verify-email-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:focus)': 'recheck()' },
  template: `
    <section class="auth" aria-labelledby="verify-title">
      <div class="auth__card">
        @if (verified()) {
          <h1 id="verify-title" i18n="@@verify.done.title">Email confirmed</h1>
          <p class="auth__lead" i18n="@@verify.done.lead">
            You’re all set. The editor is open to you.
          </p>
          <button class="btn btn--primary btn--block auth__gap" type="button" (click)="continue()">
            <ng-container i18n="@@verify.continue">Continue</ng-container>
          </button>
        } @else {
          <h1 id="verify-title" i18n="@@verify.title">Check your inbox</h1>
          <p class="auth__lead">
            <ng-container i18n="@@verify.lead">We sent a confirmation link to</ng-container>
            <strong class="verify__email">{{ email() }}</strong>
          </p>
          <p class="verify__steps" i18n="@@verify.steps">
            Open the email and click the link to unlock the editor. It works once, for 24 hours.
            Your account works in the meantime.
          </p>

          @if (sent()) {
            <p class="notice notice--success auth__gap" role="status" i18n="@@verify.resent">
              A new link is on its way. Earlier links no longer work.
            </p>
          }
          @if (error()) {
            <p class="notice notice--error auth__gap" role="alert">{{ error() }}</p>
          }

          <div class="verify__actions">
            <button
              class="btn btn--primary btn--block"
              type="button"
              [disabled]="busy() || cooldown() > 0"
              (click)="resend()"
            >
              @if (cooldown() > 0) {
                <ng-container i18n="@@verify.resendIn">Resend in {{ cooldown() }} s</ng-container>
              } @else {
                <ng-container i18n="@@verify.resend">Resend the email</ng-container>
              }
            </button>
            <button class="btn btn--ghost btn--block" type="button" (click)="recheck()">
              <ng-container i18n="@@verify.checked">I’ve clicked the link</ng-container>
            </button>
          </div>

          <p class="auth__alt">
            <ng-container i18n="@@verify.wrongEmail">Wrong email?</ng-container>
            <button class="link-button" type="button" (click)="startOver()">
              <ng-container i18n="@@verify.startOver">Log out and register again</ng-container>
            </button>
          </p>
        }
      </div>
    </section>
  `,
  styles: `
    .auth__gap {
      margin-top: 20px;
    }
    .verify__email {
      display: block;
      margin-top: 4px;
      color: var(--ink);
      overflow-wrap: anywhere;
    }
    .verify__steps {
      margin-top: 16px;
      color: var(--ink-2);
      font-size: 0.9375rem;
    }
    .verify__actions {
      display: grid;
      gap: 10px;
      margin-top: 24px;
    }
  `,
})
export class VerifyEmailPage {
  private readonly auth = inject(AuthFacade);
  private readonly store = inject(SessionStore);
  private readonly nav = inject(ReturnNavigator);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly returnUrl = toSignal(
    this.route.queryParamMap.pipe(map((q) => q.get('returnUrl'))),
    { initialValue: this.route.snapshot.queryParamMap.get('returnUrl') },
  );

  protected readonly email = computed(() => this.store.user()?.email ?? '');
  protected readonly verified = computed(() => this.store.user()?.emailVerified === true);
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Starts running: whoever lands here usually has an email that was just sent. */
  protected readonly cooldown = signal(RESEND_COOLDOWN_S);

  constructor() {
    const timer = setInterval(() => {
      if (this.cooldown() > 0) this.cooldown.update((s) => s - 1);
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected async resend(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.sent.set(false);
    try {
      await this.auth.resendVerification();
      this.sent.set(true);
      this.cooldown.set(RESEND_COOLDOWN_S);
    } catch (e) {
      this.error.set(describeError(e));
    } finally {
      this.busy.set(false);
    }
  }

  /** Asks the API again; the template switches to "confirmed" if it now is. */
  protected async recheck(): Promise<void> {
    if (this.verified()) return;
    await this.auth.refresh();
  }

  protected async continue(): Promise<void> {
    await this.nav.go(this.returnUrl(), '/account');
  }

  protected async startOver(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/register');
  }
}
