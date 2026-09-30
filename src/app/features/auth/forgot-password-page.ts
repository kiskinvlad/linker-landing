import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { describeError } from './auth-messages';

/**
 * Forgot password (plan §10). The API answers 202 whether or not the address has
 * an account, and this page must not undo that: the confirmation is the same
 * sentence either way, and nothing on it depends on the response beyond success.
 */
@Component({
  selector: 'kit-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth" aria-labelledby="forgot-title">
      <div class="auth__card">
        <h1 id="forgot-title" i18n="@@forgot.title">Reset your password</h1>

        @if (sentTo(); as email) {
          <p class="notice notice--success auth__sent" role="status" i18n="@@forgot.sent">
            If an account exists for {{ email }}, we’ve sent a link to reset the password. It works
            once and expires in 30 minutes.
          </p>
          <p class="auth__lead" i18n="@@forgot.sentHint">
            Nothing arrived? Check your spam folder, or try again in a few minutes.
          </p>
          <p class="auth__alt">
            <a routerLink="/login" i18n="@@forgot.backToLogin">Back to log in</a>
          </p>
        } @else {
          <p class="auth__lead" i18n="@@forgot.lead">
            Enter your account’s email and we’ll send you a link to choose a new password.
          </p>
          <form class="auth__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            @if (error()) {
              <p class="notice notice--error" role="alert">{{ error() }}</p>
            }
            <div class="field">
              <label class="field__label" for="forgot-email" i18n="@@field.email">Email</label>
              <input
                id="forgot-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                inputmode="email"
                [attr.aria-invalid]="showError()"
              />
              @if (showError()) {
                <p class="field__error" i18n="@@auth.error.email">Enter a valid email address.</p>
              }
            </div>
            <button class="btn btn--primary btn--block" type="submit" [disabled]="busy()">
              @if (busy()) {
                <ng-container i18n="@@forgot.submitting">Sending…</ng-container>
              } @else {
                <ng-container i18n="@@forgot.submit">Send reset link</ng-container>
              }
            </button>
          </form>
          <p class="auth__alt">
            <a routerLink="/login" i18n="@@forgot.backToLogin">Back to log in</a>
          </p>
        }
      </div>
    </section>
  `,
  styles: `
    .auth__sent {
      margin-top: 20px;
    }
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthFacade);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sentTo = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [
      inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '',
      [Validators.required, Validators.email, Validators.maxLength(320)],
    ],
  });

  protected showError(): boolean {
    const c = this.form.controls.email;
    return c.invalid && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    this.busy.set(true);
    const email = this.form.controls.email.value.trim();
    try {
      await this.auth.forgotPassword(email);
      this.sentTo.set(email);
    } catch (e) {
      // Only transport problems and rate limits land here: the API never says
      // whether the address exists.
      this.error.set(describeError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
