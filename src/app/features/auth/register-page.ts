import { ChangeDetectionStrategy, Component, LOCALE_ID, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { AuthFacade } from '../../core/auth/auth.facade';
import { safeReturnUrl } from '../../core/auth/return-url';
import { Ga4Loader } from '../../core/consent/ga4.loader';
import { describeError, fieldMessages } from './auth-messages';
import { PASSWORD_MAX, PASSWORD_MIN, PasswordStrength } from './password-strength';

type Field = 'firstName' | 'lastName' | 'email' | 'company' | 'password';

/**
 * Registration (plan §10). Validators mirror linker-backend's RegisterDto: email
 * ≤ 320, password 12–256, names 1–100, company ≤ 200 and optional.
 *
 * The plan picker shows Free as the only choice; the API has no plan field yet, so
 * nothing is sent for it. Pricing links arrive with `?plan=free`.
 */
@Component({
  selector: 'kit-register-page',
  imports: [ReactiveFormsModule, RouterLink, PasswordStrength],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth" aria-labelledby="register-title">
      <div class="auth__card auth__card--wide">
        <h1 id="register-title" i18n="@@register.title">Create your free account</h1>
        <p class="auth__lead" i18n="@@register.lead">
          One live widget and 10,000 views a month, free for good. No credit card.
        </p>

        <form class="auth__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (error()) {
            <p class="notice notice--error" role="alert">{{ error() }}</p>
          }

          <div class="auth__row">
            <div class="field">
              <label class="field__label" for="reg-first" i18n="@@field.firstName"
                >First name</label
              >
              <input
                id="reg-first"
                formControlName="firstName"
                autocomplete="given-name"
                [attr.aria-invalid]="!!message('firstName')"
              />
              @if (message('firstName'); as m) {
                <p class="field__error">{{ m }}</p>
              }
            </div>
            <div class="field">
              <label class="field__label" for="reg-last" i18n="@@field.lastName">Last name</label>
              <input
                id="reg-last"
                formControlName="lastName"
                autocomplete="family-name"
                [attr.aria-invalid]="!!message('lastName')"
              />
              @if (message('lastName'); as m) {
                <p class="field__error">{{ m }}</p>
              }
            </div>
          </div>

          <div class="field">
            <label class="field__label" for="reg-email" i18n="@@field.email">Email</label>
            <input
              id="reg-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              [attr.aria-invalid]="!!message('email') || emailTaken()"
            />
            @if (emailTaken()) {
              <p class="field__error">
                <ng-container i18n="@@register.emailTaken"
                  >An account with this email already exists.</ng-container
                >
                <a
                  routerLink="/login"
                  [queryParams]="{ email: form.controls.email.value, returnUrl: returnUrl() }"
                  i18n="@@register.emailTakenLogin"
                  >Log in instead?</a
                >
              </p>
            } @else if (message('email'); as m) {
              <p class="field__error">{{ m }}</p>
            }
          </div>

          <div class="field">
            <label class="field__label" for="reg-company">
              <span i18n="@@field.company">Company</span>
              <span class="field__optional" i18n="@@field.optional">optional</span>
            </label>
            <input
              id="reg-company"
              formControlName="company"
              autocomplete="organization"
              [attr.aria-invalid]="!!message('company')"
            />
            @if (message('company'); as m) {
              <p class="field__error">{{ m }}</p>
            }
          </div>

          <div class="field field--password">
            <label class="field__label" for="reg-password" i18n="@@field.password">Password</label>
            <div class="field__control">
              <input
                id="reg-password"
                [type]="reveal() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
                [attr.minlength]="min"
                [attr.aria-invalid]="!!message('password')"
                aria-describedby="reg-password-strength"
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
            <kit-password-strength id="reg-password-strength" [value]="password()" />
            @if (message('password'); as m) {
              <p class="field__error">{{ m }}</p>
            }
          </div>

          <fieldset class="plans">
            <legend class="field__label" i18n="@@register.plan">Plan</legend>
            <label class="plan-option is-selected">
              <input type="radio" name="plan" value="free" checked />
              <span>
                <strong i18n="@@plans.free.name">Free</strong>
                <span class="plan-option__desc" i18n="@@register.plan.freeDesc"
                  >1 widget · 10,000 views/month</span
                >
              </span>
            </label>
            <label class="plan-option is-disabled">
              <input type="radio" name="plan" value="pro" disabled />
              <span>
                <strong>Pro</strong>
                <span class="plan-option__desc" i18n="@@plans.badge.soon">Coming soon</span>
              </span>
            </label>
          </fieldset>

          <button class="btn btn--primary btn--block" type="submit" [disabled]="busy()">
            @if (busy()) {
              <ng-container i18n="@@register.submitting">Creating your account…</ng-container>
            } @else {
              <ng-container i18n="@@register.submit">Create account</ng-container>
            }
          </button>

          <!-- Informational, not a consent checkbox (plan §10). -->
          <p class="auth__fine" i18n="@@register.privacy">
            We use your details to run your account, as described in our
            <a routerLink="/legal/privacy">Privacy Policy</a>.
          </p>
        </form>

        <p class="auth__alt">
          <ng-container i18n="@@register.haveAccount">Already have an account?</ng-container>
          <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl() }" i18n="@@nav.login"
            >Log in</a
          >
        </p>
      </div>
    </section>
  `,
  styles: `
    .plans {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .plans legend {
      grid-column: 1 / -1;
      margin-bottom: 6px;
    }
    .plan-option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--bg);
    }
    .plan-option.is-selected {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }
    .plan-option.is-disabled {
      opacity: 0.6;
    }
    .plan-option input {
      margin-top: 3px;
      accent-color: var(--accent);
    }
    .plan-option strong {
      display: block;
      color: var(--ink);
      font-size: 0.9375rem;
    }
    .plan-option__desc {
      color: var(--ink-3);
      font-size: 0.8125rem;
    }
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  /** `en` or `uk`: the account's emails start in the language the visitor signed up in. */
  private readonly locale = inject(LOCALE_ID);
  private readonly ga = inject(Ga4Loader);

  private readonly route = inject(ActivatedRoute);
  /** Live, not a snapshot: see LoginPage.returnUrl. */
  protected readonly returnUrl = toSignal(
    this.route.queryParamMap.pipe(map((q) => q.get('returnUrl'))),
    { initialValue: this.route.snapshot.queryParamMap.get('returnUrl') },
  );
  protected readonly min = PASSWORD_MIN;
  protected readonly reveal = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly emailTaken = signal(false);
  private readonly submitted = signal(false);
  private readonly serverErrors = signal<Partial<Record<Field, string>>>({});

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
    company: ['', [Validators.maxLength(200)]],
    password: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN), Validators.maxLength(PASSWORD_MAX)],
    ],
  });

  protected readonly password = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  private readonly localMessages: Record<Field, string> = {
    firstName: $localize`:@@auth.error.firstName:Enter your first name (up to 100 characters).`,
    lastName: $localize`:@@auth.error.lastName:Enter your last name (up to 100 characters).`,
    email: $localize`:@@auth.error.email:Enter a valid email address.`,
    company: $localize`:@@auth.error.company:Up to 200 characters.`,
    password: $localize`:@@auth.error.passwordLength:Use 12 to 256 characters.`,
  };

  constructor() {
    // A server-side error on a field clears as soon as the visitor edits it.
    this.form.valueChanges.subscribe(() => {
      if (Object.keys(this.serverErrors()).length) this.serverErrors.set({});
      this.emailTaken.set(false);
    });
  }

  protected message(name: Field): string | null {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted()) ? this.localMessages[name] : null;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    this.busy.set(true);
    const { company, ...rest } = this.form.getRawValue();
    try {
      await this.auth.register({
        ...rest,
        ...(company.trim() ? { company: company.trim() } : {}),
        preferredLanguage: this.locale,
      });
      this.ga.event('sign_up');
      // Signed in but unverified: "check your inbox" comes next (plan §10), and it
      // carries the returnUrl on for after the link is clicked.
      await this.router.navigate(['/verify-email'], {
        queryParams: { returnUrl: safeReturnUrl(this.returnUrl(), '/account') },
      });
    } catch (e) {
      const err = ApiError.from(e);
      if (err.status === 409) {
        this.emailTaken.set(true);
      } else {
        const fields = fieldMessages(err, [
          'firstName',
          'lastName',
          'email',
          'company',
          'password',
        ]);
        this.serverErrors.set(fields);
        if (!Object.keys(fields).length) this.error.set(describeError(err));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
