import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthFacade } from '../../core/auth/auth.facade';
import { SessionStore } from '../../core/auth/session.store';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { Ga4Loader } from '../../core/consent/ga4.loader';
import { describeError } from './auth-messages';

/** 32 random bytes, base64url without padding (linker-backend VerifyEmailDto). */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

type State = 'working' | 'done' | 'invalid' | 'error';

/**
 * Where the email's link lands (plan §10). Public: the link is often opened on a
 * phone that is signed in to nothing, and the token alone is the proof.
 *
 * Like the reset page, the token is read once and removed from the address bar
 * straight away. Unknown, used and expired links get one message, as the API
 * gives one 400, plus a way to get a new one.
 */
@Component({
  selector: 'kit-verify-email-confirm-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth" aria-labelledby="confirm-title">
      <div class="auth__card" aria-live="polite">
        @switch (state()) {
          @case ('working') {
            <h1 id="confirm-title" i18n="@@verify.confirm.working">Confirming your email…</h1>
          }
          @case ('done') {
            <h1 id="confirm-title" i18n="@@verify.done.title">Email confirmed</h1>
            <p class="auth__lead" i18n="@@verify.done.lead">
              You’re all set. The editor is open to you.
            </p>
            <div class="confirm__actions">
              @if (session.isAuthenticated()) {
                <a class="btn btn--primary btn--block" [href]="identity.editorPath">
                  <ng-container i18n="@@nav.openEditor">Open editor</ng-container>
                </a>
                <a class="btn btn--ghost btn--block" routerLink="/account">
                  <ng-container i18n="@@account.goTo">Go to your account</ng-container>
                </a>
              } @else {
                <a
                  class="btn btn--primary btn--block"
                  routerLink="/login"
                  [queryParams]="{ returnUrl: identity.editorPath }"
                >
                  <ng-container i18n="@@verify.confirm.login"
                    >Log in to open the editor</ng-container
                  >
                </a>
              }
            </div>
          }
          @case ('invalid') {
            <h1 id="confirm-title" i18n="@@verify.confirm.invalidTitle">This link doesn’t work</h1>
            <p
              class="notice notice--error confirm__gap"
              role="alert"
              i18n="@@verify.confirm.invalid"
            >
              It is invalid, already used or expired. Links work once, for 24 hours, and only the
              newest one counts.
            </p>
            <div class="confirm__actions">
              @if (session.isAuthenticated()) {
                @if (resent()) {
                  <p class="notice notice--success" role="status" i18n="@@verify.resent">
                    A new link is on its way. Earlier links no longer work.
                  </p>
                } @else {
                  <button
                    class="btn btn--primary btn--block"
                    type="button"
                    [disabled]="busy()"
                    (click)="resend()"
                  >
                    <ng-container i18n="@@verify.resendNew">Send a new link</ng-container>
                  </button>
                }
                @if (error()) {
                  <p class="notice notice--error" role="alert">{{ error() }}</p>
                }
              } @else {
                <a
                  class="btn btn--primary btn--block"
                  routerLink="/login"
                  [queryParams]="{ returnUrl: '/verify-email' }"
                >
                  <ng-container i18n="@@verify.confirm.loginForNew"
                    >Log in to get a new link</ng-container
                  >
                </a>
              }
            </div>
          }
          @case ('error') {
            <h1 id="confirm-title" i18n="@@verify.confirm.errorTitle">
              We couldn’t confirm it yet
            </h1>
            <p class="notice notice--error confirm__gap" role="alert">{{ error() }}</p>
            <button class="btn btn--primary btn--block confirm__gap" type="button" (click)="run()">
              <ng-container i18n="@@verify.confirm.retry">Try again</ng-container>
            </button>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .confirm__gap {
      margin-top: 20px;
    }
    .confirm__actions {
      display: grid;
      gap: 10px;
      margin-top: 24px;
    }
  `,
})
export class VerifyEmailConfirmPage {
  private readonly auth = inject(AuthFacade);
  private readonly ga = inject(Ga4Loader);
  protected readonly session = inject(SessionStore);
  protected readonly identity = inject(APP_IDENTITY);

  /** Read once, then gone from the URL. */
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  protected readonly state = signal<State>('working');
  protected readonly busy = signal(false);
  protected readonly resent = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(Location).replaceState('/verify-email/confirm');
    void this.run();
  }

  protected async run(): Promise<void> {
    this.state.set('working');
    this.error.set(null);
    // Who is signed in decides which buttons follow, so settle it first.
    await this.auth.ensureKnown();
    if (!TOKEN_SHAPE.test(this.token)) {
      this.state.set('invalid');
      return;
    }
    try {
      await this.auth.verifyEmail(this.token);
      this.ga.event('email_verified');
      this.state.set('done');
    } catch (e) {
      const err = ApiError.from(e);
      if (err.status === 400) {
        this.state.set('invalid');
      } else {
        this.error.set(describeError(err));
        this.state.set('error');
      }
    }
  }

  protected async resend(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.resendVerification();
      this.resent.set(true);
    } catch (e) {
      this.error.set(describeError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
