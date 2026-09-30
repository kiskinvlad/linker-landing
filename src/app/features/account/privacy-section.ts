import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { User } from '../../core/api/auth.api';
import { AccountFacade } from '../../core/auth/account.facade';
import { ConsentService } from '../../core/consent/consent.service';
import { describeError } from '../auth/auth-messages';

/**
 * Plan §10 "Privacy": cookie choices, the accepted terms version, and account
 * deletion. Deleting takes two proofs: the email typed out (against a slip of
 * the finger) and the password (against someone else at an open session; the
 * API requires it too).
 */
@Component({
  selector: 'kit-privacy-section',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" aria-labelledby="privacy-title">
      <h2 id="privacy-title" i18n="@@account.privacy.title">Privacy</h2>

      <h3 class="panel__sub" i18n="@@account.privacy.cookiesTitle">Cookies</h3>
      <p class="panel__lead" i18n="@@account.privacy.cookiesLead">
        Choose whether we may use analytics cookies on this site.
      </p>
      <div class="panel__actions">
        <button class="btn btn--ghost" type="button" (click)="consent.openSettings()">
          <ng-container i18n="@@account.privacy.cookieSettings">Cookie settings</ng-container>
        </button>
      </div>

      <h3 class="panel__sub" i18n="@@account.privacy.termsTitle">Terms of Service</h3>
      @if (user().legal; as legal) {
        @if (legal.termsVersionAccepted && legal.termsAcceptedAt) {
          <p class="panel__lead" i18n="@@account.privacy.termsAccepted">
            You accepted version {{ legal.termsVersionAccepted }} on
            {{ legal.termsAcceptedAt | date: 'longDate' }}.
          </p>
        } @else {
          <p class="panel__lead" i18n="@@account.privacy.termsPending">
            You’ll be asked to accept them the first time you open the editor.
          </p>
        }
      }
      <p class="panel__lead">
        <a routerLink="/legal/terms" i18n="@@account.privacy.readTerms">Read the Terms</a>
        ·
        <a routerLink="/legal/privacy" i18n="@@account.privacy.readPrivacy">Privacy Policy</a>
      </p>

      <h3 class="panel__sub panel__sub--danger" i18n="@@account.delete.title">Delete account</h3>
      <p class="panel__lead" i18n="@@account.delete.lead">
        Your account is closed and every device is signed out. You won’t be able to sign up again
        with this email address.
      </p>

      @if (!confirming()) {
        <div class="panel__actions">
          <button class="btn btn--danger" type="button" (click)="confirming.set(true)">
            <ng-container i18n="@@account.delete.start">Delete my account…</ng-container>
          </button>
        </div>
      } @else {
        <form class="panel__form danger-zone" [formGroup]="form" (ngSubmit)="remove()" novalidate>
          @if (error()) {
            <p class="notice notice--error" role="alert">{{ error() }}</p>
          }
          <div class="field">
            <label class="field__label" for="delete-email" i18n="@@account.delete.typeEmail"
              >Type your email address to confirm</label
            >
            <input
              id="delete-email"
              type="email"
              formControlName="email"
              autocomplete="off"
              [attr.placeholder]="user().email"
            />
          </div>
          <div class="field">
            <label class="field__label" for="delete-password" i18n="@@field.password"
              >Password</label
            >
            <input
              id="delete-password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="wrongPassword()"
            />
            @if (wrongPassword()) {
              <p class="field__error" i18n="@@account.delete.wrongPassword">
                That password isn’t right.
              </p>
            }
          </div>
          <div class="panel__actions">
            <button class="btn btn--danger" type="submit" [disabled]="!canDelete() || busy()">
              @if (busy()) {
                <ng-container i18n="@@account.delete.deleting">Deleting…</ng-container>
              } @else {
                <ng-container i18n="@@account.delete.confirm">Delete my account</ng-container>
              }
            </button>
            <button class="btn btn--ghost" type="button" (click)="cancel()">
              <ng-container i18n="@@account.cancel">Cancel</ng-container>
            </button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .panel__sub--danger {
      color: var(--danger);
    }
    .danger-zone {
      padding: 16px;
      border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent);
      border-radius: var(--radius-sm);
    }
  `,
})
export class PrivacySection {
  private readonly account = inject(AccountFacade);
  private readonly router = inject(Router);
  protected readonly consent = inject(ConsentService);

  readonly user = input.required<User>();

  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);
  protected readonly wrongPassword = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [''],
    password: ['', [Validators.required]],
  });

  private readonly value = signal(this.form.getRawValue());
  /** Enabled only once the typed address matches, case aside. */
  protected readonly canDelete = computed(
    () =>
      this.value().email.trim().toLowerCase() === this.user().email.toLowerCase() &&
      this.value().password.length > 0,
  );

  constructor() {
    this.form.valueChanges.subscribe(() => {
      this.value.set(this.form.getRawValue());
      this.wrongPassword.set(false);
    });
  }

  protected cancel(): void {
    this.form.reset();
    this.confirming.set(false);
    this.error.set(null);
  }

  protected async remove(): Promise<void> {
    if (!this.canDelete()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.account.deleteAccount(this.form.controls.password.value);
      await this.router.navigateByUrl('/');
    } catch (e) {
      const err = ApiError.from(e);
      if (err.status === 401) this.wrongPassword.set(true);
      else this.error.set(describeError(err));
    } finally {
      this.busy.set(false);
    }
  }
}
