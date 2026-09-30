import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthFacade } from '../../core/auth/auth.facade';
import { ReturnNavigator } from '../../core/auth/auth.guards';
import { Ga4Loader } from '../../core/consent/ga4.loader';
import { describeError, fieldMessages } from './auth-messages';

@Component({
  selector: 'kit-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth" aria-labelledby="login-title">
      <div class="auth__card">
        <h1 id="login-title" i18n="@@login.title">Log in</h1>
        <p class="auth__lead" i18n="@@login.lead">Welcome back. Pick up where you left off.</p>

        <form class="auth__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (passwordChanged) {
            <p class="notice notice--success" role="status" i18n="@@login.passwordChanged">
              Your password was changed. Log in with the new one.
            </p>
          }
          @if (error()) {
            <p class="notice notice--error" role="alert">{{ error() }}</p>
          }

          <div class="field">
            <label class="field__label" for="login-email" i18n="@@field.email">Email</label>
            <input
              id="login-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              [attr.aria-invalid]="showError('email')"
              aria-describedby="login-email-error"
            />
            @if (showError('email')) {
              <p id="login-email-error" class="field__error" i18n="@@auth.error.email">
                Enter a valid email address.
              </p>
            }
          </div>

          <div class="field field--password">
            <label class="field__label" for="login-password">
              <span i18n="@@field.password">Password</span>
              <a
                routerLink="/forgot-password"
                [queryParams]="{ email: form.controls.email.value || null }"
                i18n="@@login.forgot"
                >Forgot password?</a
              >
            </label>
            <div class="field__control">
              <input
                id="login-password"
                [type]="reveal() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                [attr.aria-invalid]="showError('password')"
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
          </div>

          <button class="btn btn--primary btn--block" type="submit" [disabled]="busy()">
            @if (busy()) {
              <ng-container i18n="@@login.submitting">Logging in…</ng-container>
            } @else {
              <ng-container i18n="@@login.submit">Log in</ng-container>
            }
          </button>
        </form>

        <p class="auth__alt">
          <ng-container i18n="@@login.noAccount">New here?</ng-container>
          <a
            routerLink="/register"
            [queryParams]="{ returnUrl: returnUrl() }"
            i18n="@@login.createAccount"
            >Create a free account</a
          >
        </p>
      </div>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthFacade);
  private readonly nav = inject(ReturnNavigator);
  private readonly ga = inject(Ga4Loader);
  private readonly route = inject(ActivatedRoute);
  private readonly query = this.route.snapshot.queryParamMap;

  /**
   * Read live, not from the snapshot: moving from /login to /login?returnUrl=… (the
   * header's "Open editor" while on this page) reuses this component, and a
   * snapshot would keep the old value and drop the visitor on the wrong page.
   */
  protected readonly returnUrl = toSignal(
    this.route.queryParamMap.pipe(map((q) => q.get('returnUrl'))),
    { initialValue: this.query.get('returnUrl') },
  );
  protected readonly passwordChanged = this.query.get('reset') === '1';
  protected readonly reveal = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [
      this.query.get('email') ?? '',
      [Validators.required, Validators.email, Validators.maxLength(320)],
    ],
    // No length rule here, matching the API: a short wrong password and a long
    // wrong password must fail the same way.
    password: ['', [Validators.required, Validators.maxLength(256)]],
  });

  protected showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const user = await this.auth.login(this.form.getRawValue());
      this.ga.event('login');
      await this.nav.afterSignIn(user, this.returnUrl());
    } catch (e) {
      const err = ApiError.from(e);
      this.error.set(
        err.status === 401
          ? $localize`:@@login.error.credentials:That email and password don’t match. Check both and try again.`
          : err.status === 400 && Object.keys(fieldMessages(err, ['email', 'password'])).length
            ? $localize`:@@auth.error.generic:Something went wrong. Please check the form and try again.`
            : describeError(err),
      );
    } finally {
      this.busy.set(false);
    }
  }
}
