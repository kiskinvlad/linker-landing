import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthFacade } from '../../core/auth/auth.facade';
import { describeError } from './auth-messages';
import { PASSWORD_MAX, PASSWORD_MIN, PasswordStrength } from './password-strength';

/** 32 random bytes, base64url without padding (linker-backend ResetPasswordDto). */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/**
 * Set a new password from the emailed link (plan §10).
 *
 * The token is read once and immediately removed from the address bar, so it
 * doesn't linger in history, screenshots or analytics. Unknown, used and expired
 * tokens get one message, exactly as the API gives one 400. Success does NOT sign
 * in — the API deliberately doesn't — so the visitor goes to log in.
 */
@Component({
  selector: 'kit-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, PasswordStrength],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth" aria-labelledby="reset-title">
      <div class="auth__card">
        <h1 id="reset-title" i18n="@@reset.title">Choose a new password</h1>

        @if (linkInvalid()) {
          <p class="notice notice--error auth__gap" role="alert" i18n="@@reset.invalid">
            This reset link is invalid, already used or expired. Links work once, for 30 minutes.
          </p>
          <a
            class="btn btn--primary btn--block auth__gap"
            routerLink="/forgot-password"
            i18n="@@reset.requestNew"
            >Request a new link</a
          >
        } @else {
          <p class="auth__lead" i18n="@@reset.lead">
            Signed-in devices will be signed out, including this browser if it is.
          </p>
          <form class="auth__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            @if (error()) {
              <p class="notice notice--error" role="alert">{{ error() }}</p>
            }
            <div class="field field--password">
              <label class="field__label" for="reset-password" i18n="@@reset.newPassword"
                >New password</label
              >
              <div class="field__control">
                <input
                  id="reset-password"
                  [type]="reveal() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="new-password"
                  [attr.minlength]="min"
                  [attr.aria-invalid]="showError()"
                  aria-describedby="reset-password-strength"
                />
                <button
                  type="button"
                  class="field__reveal"
                  (click)="reveal.set(!reveal())"
                  [attr.aria-pressed]="reveal()"
                >
                  @if (reveal()) {
                    <ng-container i18n="@@field.hide">Hide</ng-container>
                  } @else {
                    <ng-container i18n="@@field.show">Show</ng-container>
                  }
                </button>
              </div>
              <kit-password-strength id="reset-password-strength" [value]="password()" />
              @if (showError()) {
                <p class="field__error" i18n="@@auth.error.passwordLength">
                  Use 12 to 256 characters.
                </p>
              }
            </div>
            <button class="btn btn--primary btn--block" type="submit" [disabled]="busy()">
              @if (busy()) {
                <ng-container i18n="@@reset.submitting">Saving…</ng-container>
              } @else {
                <ng-container i18n="@@reset.submit">Set new password</ng-container>
              }
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styles: `
    .auth__gap {
      margin-top: 20px;
    }
  `,
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  /** Read once, then gone from the URL. */
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  protected readonly min = PASSWORD_MIN;
  protected readonly reveal = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly linkInvalid = signal(!TOKEN_SHAPE.test(this.token));
  private readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    password: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN), Validators.maxLength(PASSWORD_MAX)],
    ],
  });

  protected readonly password = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  constructor() {
    inject(Location).replaceState('/reset-password');
  }

  protected showError(): boolean {
    const c = this.form.controls.password;
    return c.invalid && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      await this.auth.resetPassword(this.token, this.form.controls.password.value);
      await this.router.navigate(['/login'], { queryParams: { reset: 1 } });
    } catch (e) {
      const err = ApiError.from(e);
      // A 400 is the token (unknown, used, expired: one answer) unless the API
      // blamed the password itself, which our own validators should have caught.
      if (err.status === 400 && !err.fieldErrors(['password'])['password']) {
        this.linkInvalid.set(true);
      } else {
        this.error.set(describeError(err));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
