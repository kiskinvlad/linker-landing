import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { ConsentService } from '../../core/consent/consent.service';
import { Logo } from '../../shared/ui/logo';

@Component({
  selector: 'kit-site-footer',
  imports: [RouterLink, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <div class="container footer__grid">
        <div class="footer__brand">
          <kit-logo [height]="24" />
          <p i18n="@@footer.tagline">
            On-brand offers, forms and banners for any store — no developer needed.
          </p>
        </div>

        <nav i18n-aria-label="@@footer.product" aria-label="Product">
          <h2 class="footer__title" i18n="@@footer.product">Product</h2>
          <ul>
            <li><a routerLink="/how-it-works" i18n="@@nav.howItWorks">How it works</a></li>
            <li><a routerLink="/pricing" i18n="@@nav.pricing">Pricing</a></li>
            <li><a routerLink="/" fragment="faq" i18n="@@footer.faq">FAQ</a></li>
            <li><a [href]="identity.editorPath" i18n="@@nav.openEditor">Open editor</a></li>
          </ul>
        </nav>

        <nav i18n-aria-label="@@footer.account" aria-label="Account">
          <h2 class="footer__title" i18n="@@footer.account">Account</h2>
          <ul>
            <li><a routerLink="/register" i18n="@@footer.signupFree">Sign up free</a></li>
            <li><a routerLink="/login" i18n="@@nav.login">Log in</a></li>
          </ul>
        </nav>

        <nav i18n-aria-label="@@footer.legal" aria-label="Legal">
          <h2 class="footer__title" i18n="@@footer.legal">Legal</h2>
          <ul>
            <li><a routerLink="/legal" i18n="@@footer.legalCenter">Legal center</a></li>
            <li><a routerLink="/legal/terms" i18n="@@footer.terms">Terms</a></li>
            <li><a routerLink="/legal/privacy" i18n="@@footer.privacy">Privacy</a></li>
            <li><a routerLink="/legal/cookies" i18n="@@footer.cookies">Cookies</a></li>
            <li>
              <a routerLink="/legal/feedback-program" i18n="@@footer.feedbackProgram"
                >Feedback program</a
              >
            </li>
            <li>
              <a routerLink="/legal" fragment="contact" i18n="@@footer.reportAbuse"
                >Report a widget</a
              >
            </li>
            <!-- Reopens the consent panel (plan §8). "Your privacy choices" is the CCPA
                 wording; with no geolocation on a static site it is shown to everyone. -->
            <li>
              <button
                type="button"
                class="footer__link"
                (click)="consent.openSettings()"
                i18n="@@footer.cookieSettings"
              >
                Cookie settings
              </button>
            </li>
            <li>
              <button
                type="button"
                class="footer__link"
                (click)="consent.openSettings()"
                i18n="@@footer.privacyChoices"
              >
                Your privacy choices
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div class="container footer__base">
        <p i18n="@@footer.copyright">
          © {{ year }} {{ identity.productName }}. All rights reserved.
        </p>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      padding-top: 64px;
      background: var(--bg-2);
      border-top: 1px solid var(--border);
      color: var(--ink-2);
      font-size: 0.9375rem;
    }
    .footer__grid {
      display: grid;
      grid-template-columns: 2fr repeat(3, 1fr);
      gap: 40px;
    }
    .footer__brand {
      color: var(--ink);
    }
    .footer__brand p {
      max-width: 300px;
      margin-top: 16px;
      color: var(--ink-2);
    }
    .footer__title {
      margin-bottom: 14px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 400;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-3);
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 10px;
    }
    a {
      color: var(--ink-2);
      text-decoration: none;
    }
    a:hover,
    .footer__link:hover {
      color: var(--ink);
      text-decoration: underline;
    }
    /* Buttons (they open a panel, not a page) styled as the links around them. */
    .footer__link {
      padding: 0;
      border: 0;
      background: none;
      color: var(--ink-2);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .footer__base {
      margin-top: 56px;
      padding-block: 24px;
      border-top: 1px solid var(--border);
      font-size: 0.875rem;
      color: var(--ink-3);
    }
    @media (max-width: 760px) {
      .footer__grid {
        grid-template-columns: 1fr 1fr;
      }
      .footer__brand {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class SiteFooter {
  protected readonly identity = inject(APP_IDENTITY);
  protected readonly consent = inject(ConsentService);
  protected readonly year = new Date().getFullYear();
}
