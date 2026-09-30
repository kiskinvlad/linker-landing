import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { PlanSection } from './plan-section';
import { PrivacySection } from './privacy-section';
import { ProfileSection } from './profile-section';
import { SecuritySection } from './security-section';

/**
 * The account area, `/account` (plan §10): profile, security, plan and privacy
 * on one page, with a section index. One page rather than four routes because
 * each section is short, and a visitor looking for "delete my account" should be
 * able to find it by scrolling. Guarded by `authGuard`; the API is the boundary.
 */
@Component({
  selector: 'kit-account-page',
  imports: [RouterLink, ProfileSection, SecuritySection, PlanSection, PrivacySection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as user) {
      <div class="cabinet container">
        <header class="cabinet__head">
          <h1 i18n="@@account.title">Your account</h1>
          <p class="cabinet__lead">{{ user.email }}</p>
        </header>

        @if (!user.emailVerified) {
          <p class="notice notice--warning cabinet__verify" role="status">
            <ng-container i18n="@@account.verifyNotice"
              >Confirm your email address to open the editor.</ng-container
            >
            <a routerLink="/verify-email" i18n="@@account.verifyLink">Resend the link</a>
          </p>
        }

        <div class="cabinet__layout">
          <nav
            class="cabinet__nav"
            i18n-aria-label="@@account.sections"
            aria-label="Account sections"
          >
            <a href="#profile" i18n="@@account.profile.title">Profile</a>
            <a href="#security" i18n="@@account.security.title">Security</a>
            <a href="#plan" i18n="@@account.plan.title">Plan &amp; billing</a>
            <a href="#privacy" i18n="@@account.privacy.title">Privacy</a>
          </nav>

          <div class="cabinet__sections">
            <kit-profile-section id="profile" [user]="user" />
            <kit-security-section id="security" />
            <kit-plan-section id="plan" />
            <kit-privacy-section id="privacy" [user]="user" />
          </div>
        </div>
      </div>
    }
  `,
})
export class AccountPage {
  protected readonly user = inject(SessionStore).user;
}
