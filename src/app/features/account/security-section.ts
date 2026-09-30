import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthFacade } from '../../core/auth/auth.facade';
import { describeError } from '../auth/auth-messages';
import { PASSWORD_MAX, PASSWORD_MIN, PasswordStrength } from '../auth/password-strength';

/**
 * Plan §10 "Security": change password (other devices are signed out; this one
 * stays, because the API issues it a new cookie) and log out everywhere.
 */
@Component({
  selector: 'kit-security-section',
  imports: [ReactiveFormsModule, PasswordStrength],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" aria-labelledby="security-title">
      <h2 id="security-title" i18n="@@account.security.title">Security</h2>

      <h3 class="panel__sub" i18n="@@account.security.changeTitle">Change password</h3>
      <p class="panel__lead" i18n="@@account.security.changeLead">
        Your other devices will be signed out. This one stays signed in.
      </p>
      <form class="panel__form" [formGroup]="form" (ngSubmit)="change()" novalidate>
        @if (changed()) {
          <p class="notice notice--success" role="status" i18n="@@account.security.changed">
            Password changed. Other devices were signed out.
          </p>
        }
        @if (error()) {
          <p class="notice notice--error" role="alert">{{ error() }}</p>
        }

        <div class="field">
          <label class="field__label" for="security-current" i18n="@@account.security.current"
            >Current password</label
          >
          <input
            id="security-current"
            type="password"
            formControlName="currentPassword"
            autocomplete="current-password"
            [attr.aria-invalid]="wrongCurrent() || showError('currentPassword')"
          />
          @if (wrongCurrent()) {
            <p class="field__error" i18n="@@account.security.wrongCurrent">
              That isn’t your current password.
            </p>
          }
        </div>

        <div class="field field--password">
          <label class="field__label" for="security-new" i18n="@@reset.newPassword"
            >New password</label
          >
          <div class="field__control">
            <input
              id="security-new"
              [type]="reveal() ? 'text' : 'password'"
              formControlName="newPassword"
              autocomplete="new-password"
              [attr.minlength]="min"
              [attr.aria-invalid]="showError('newPassword')"
              aria-describedby="security-new-strength"
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
          <kit-password-strength id="security-new-strength" [value]="newPassword()" />
          @if (showError('newPassword')) {
            <p class="field__error" i18n="@@auth.error.passwordLength">Use 12 to 256 characters.</p>
          }
        </div>

        <div class="panel__actions">
          <button class="btn btn--primary" type="submit" [disabled]="busy()">
            @if (busy()) {
              <ng-container i18n="@@account.saving">Saving…</ng-container>
            } @else {
              <ng-container i18n="@@account.security.changeSubmit">Change password</ng-container>
            }
          </button>
        </div>
      </form>

      <h3 class="panel__sub" i18n="@@account.security.devicesTitle">Signed-in devices</h3>
      <p class="panel__lead" i18n="@@account.security.devicesLead">
        Lost a device or used a shared computer? End every session, including this one.
      </p>
      @if (logoutError()) {
        <p class="notice notice--error" role="alert">{{ logoutError() }}</p>
      }
      <div class="panel__actions">
        <button class="btn btn--ghost" type="button" [disabled]="busy()" (click)="logoutAll()">
          <ng-container i18n="@@account.security.logoutAll">Log out of all devices</ng-container>
        </button>
      </div>
    </section>
  `,
})
export class SecuritySection {
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly min = PASSWORD_MIN;
  protected readonly reveal = signal(false);
  protected readonly busy = signal(false);
  protected readonly changed = signal(false);
  protected readonly wrongCurrent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly logoutError = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    // Like login: no length rule on the current password, only on the new one.
    currentPassword: ['', [Validators.required, Validators.maxLength(PASSWORD_MAX)]],
    newPassword: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN), Validators.maxLength(PASSWORD_MAX)],
    ],
  });

  protected readonly newPassword = toSignal(this.form.controls.newPassword.valueChanges, {
    initialValue: '',
  });

  constructor() {
    this.form.controls.currentPassword.valueChanges.subscribe(() => this.wrongCurrent.set(false));
  }

  protected showError(name: 'currentPassword' | 'newPassword'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected async change(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    this.changed.set(false);
    if (this.form.invalid) return;
    this.busy.set(true);
    const { currentPassword, newPassword } = this.form.getRawValue();
    try {
      await this.auth.changePassword(currentPassword, newPassword);
      this.form.reset();
      this.submitted.set(false);
      this.changed.set(true);
    } catch (e) {
      const err = ApiError.from(e);
      // 401 here is the current password, not the session: a dead session would
      // have been caught by the error interceptor and signed the visitor out.
      if (err.status === 401) this.wrongCurrent.set(true);
      else this.error.set(describeError(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected async logoutAll(): Promise<void> {
    this.busy.set(true);
    this.logoutError.set(null);
    try {
      await this.auth.logoutAll();
      await this.router.navigateByUrl('/login');
    } catch (e) {
      this.logoutError.set(describeError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
