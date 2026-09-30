import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileUpdate } from '../../core/api/account.api';
import { User } from '../../core/api/auth.api';
import { AccountFacade } from '../../core/auth/account.facade';
import { LOCALES } from '../../core/i18n/locales';
import { describeError, fieldMessages } from '../auth/auth-messages';

type Field = 'firstName' | 'lastName' | 'company' | 'phone';

/** International format, loosely: the API does the real check (libphonenumber) and normalises. */
const PHONE_SHAPE = /^\+[\d\s().-]{6,24}$/;

/**
 * Plan §10 "Profile". Email is read-only: changing it needs the new address
 * verified, which is planning.md Phase 7 on the API. Only changed fields are
 * sent; an emptied company or phone is sent as null, which clears it.
 */
@Component({
  selector: 'kit-profile-section',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" aria-labelledby="profile-title">
      <h2 id="profile-title" i18n="@@account.profile.title">Profile</h2>

      <form class="panel__form" [formGroup]="form" (ngSubmit)="save()" novalidate>
        @if (saved()) {
          <p class="notice notice--success" role="status" i18n="@@account.profile.saved">Saved.</p>
        }
        @if (error()) {
          <p class="notice notice--error" role="alert">{{ error() }}</p>
        }

        <div class="field">
          <span class="field__label" i18n="@@field.email">Email</span>
          <p class="panel__readonly">
            {{ user().email }}
            @if (user().emailVerified) {
              <span class="badge badge--ok" i18n="@@account.profile.verified">Confirmed</span>
            } @else {
              <span class="badge badge--warn" i18n="@@account.profile.unverified"
                >Not confirmed</span
              >
            }
          </p>
          <p class="field__hint" i18n="@@account.profile.emailHint">
            Changing your email address isn’t available yet.
          </p>
        </div>

        <div class="auth__row">
          <div class="field">
            <label class="field__label" for="profile-first" i18n="@@field.firstName"
              >First name</label
            >
            <input
              id="profile-first"
              formControlName="firstName"
              autocomplete="given-name"
              [attr.aria-invalid]="!!message('firstName')"
            />
            @if (message('firstName'); as m) {
              <p class="field__error">{{ m }}</p>
            }
          </div>
          <div class="field">
            <label class="field__label" for="profile-last" i18n="@@field.lastName">Last name</label>
            <input
              id="profile-last"
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
          <label class="field__label" for="profile-company">
            <span i18n="@@field.company">Company</span>
            <span class="field__optional" i18n="@@field.optional">optional</span>
          </label>
          <input
            id="profile-company"
            formControlName="company"
            autocomplete="organization"
            [attr.aria-invalid]="!!message('company')"
          />
          @if (message('company'); as m) {
            <p class="field__error">{{ m }}</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="profile-phone">
            <span i18n="@@field.phone">Phone</span>
            <span class="field__optional" i18n="@@field.optional">optional</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            formControlName="phone"
            autocomplete="tel"
            inputmode="tel"
            placeholder="+380 44 123 4567"
            [attr.aria-invalid]="!!message('phone')"
            aria-describedby="profile-phone-hint"
          />
          <p id="profile-phone-hint" class="field__hint" i18n="@@account.profile.phoneHint">
            International format, starting with + and the country code.
          </p>
          @if (message('phone'); as m) {
            <p class="field__error">{{ m }}</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="profile-language" i18n="@@account.profile.language"
            >Email language</label
          >
          <select id="profile-language" formControlName="preferredLanguage">
            @for (locale of locales; track locale.id) {
              <option [value]="locale.id">{{ locale.nativeName }}</option>
            }
          </select>
        </div>

        <div class="panel__actions">
          <button class="btn btn--primary" type="submit" [disabled]="busy()">
            @if (busy()) {
              <ng-container i18n="@@account.saving">Saving…</ng-container>
            } @else {
              <ng-container i18n="@@account.save">Save changes</ng-container>
            }
          </button>
        </div>
      </form>
    </section>
  `,
})
export class ProfileSection {
  private readonly account = inject(AccountFacade);

  readonly user = input.required<User>();

  protected readonly locales = LOCALES;
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly submitted = signal(false);
  private readonly serverErrors = signal<Partial<Record<Field, string>>>({});

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    company: ['', [Validators.maxLength(200)]],
    phone: ['', [Validators.pattern(PHONE_SHAPE)]],
    preferredLanguage: ['en'],
  });

  private readonly localMessages: Record<Field, string> = {
    firstName: $localize`:@@auth.error.firstName:Enter your first name (up to 100 characters).`,
    lastName: $localize`:@@auth.error.lastName:Enter your last name (up to 100 characters).`,
    company: $localize`:@@auth.error.company:Up to 200 characters.`,
    phone: $localize`:@@account.error.phone:Enter a valid number in international format, e.g. +380 44 123 4567.`,
  };

  constructor() {
    // Fill the form from the user, and again after a save returns the stored
    // values (the API normalises the phone to E.164).
    effect(() => {
      const user = this.user();
      untracked(() =>
        this.form.reset({
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company ?? '',
          phone: user.phone ?? '',
          preferredLanguage: user.preferredLanguage,
        }),
      );
    });
    // Only the visitor's edits count: the reset above also emits, with the form
    // pristine, and must not wipe the "Saved." it just earned.
    this.form.valueChanges.subscribe(() => {
      if (!this.form.dirty) return;
      this.saved.set(false);
      if (Object.keys(this.serverErrors()).length) this.serverErrors.set({});
    });
  }

  protected message(name: Field): string | null {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted()) ? this.localMessages[name] : null;
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    const patch = this.changes();
    if (!Object.keys(patch).length) {
      this.saved.set(true);
      return;
    }
    this.busy.set(true);
    try {
      await this.account.updateProfile(patch);
      this.submitted.set(false);
      this.saved.set(true);
    } catch (e) {
      const fields = fieldMessages(e, ['firstName', 'lastName', 'company', 'phone']);
      if (fields['phone']) fields['phone'] = this.localMessages.phone;
      this.serverErrors.set(fields);
      if (!Object.keys(fields).length) this.error.set(describeError(e));
    } finally {
      this.busy.set(false);
    }
  }

  /** Only what differs from the stored user; an emptied optional field becomes null. */
  private changes(): ProfileUpdate {
    const user = this.user();
    const value = this.form.getRawValue();
    const patch: ProfileUpdate = {};
    const firstName = value.firstName.trim();
    const lastName = value.lastName.trim();
    const company = value.company.trim() || null;
    const phone = value.phone.trim() || null;
    if (firstName !== user.firstName) patch.firstName = firstName;
    if (lastName !== user.lastName) patch.lastName = lastName;
    if (company !== user.company) patch.company = company;
    if (phone !== user.phone) patch.phone = phone;
    if (value.preferredLanguage !== user.preferredLanguage) {
      patch.preferredLanguage = value.preferredLanguage;
    }
    return patch;
  }
}
