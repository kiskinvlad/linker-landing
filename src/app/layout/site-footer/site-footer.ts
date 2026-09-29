import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_IDENTITY } from '../../core/config/app-identity';
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
          <p>On-brand offers, forms and banners for any store — no developer needed.</p>
        </div>

        <nav aria-label="Product">
          <h2 class="footer__title">Product</h2>
          <ul>
            <li><a routerLink="/how-it-works">How it works</a></li>
            <li><a routerLink="/pricing">Pricing</a></li>
            <li><a routerLink="/" fragment="faq">FAQ</a></li>
            <li><a [href]="identity.editorPath">Open editor</a></li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 class="footer__title">Account</h2>
          <ul>
            <li><a href="/register">Sign up free</a></li>
            <li><a href="/login">Log in</a></li>
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2 class="footer__title">Legal</h2>
          <ul>
            <li><a routerLink="/legal/terms">Terms</a></li>
            <li><a routerLink="/legal/privacy">Privacy</a></li>
            <li><a routerLink="/legal/cookies">Cookies</a></li>
            <li><a routerLink="/legal/feedback-program">Feedback program</a></li>
          </ul>
        </nav>
      </div>

      <div class="container footer__base">
        <p>© {{ year }} {{ identity.productName }}. All rights reserved.</p>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      padding-top: 64px;
      background: var(--bg-soft);
      border-top: 1px solid var(--line);
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
      font-weight: 500;
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
    a:hover {
      color: var(--ink);
      text-decoration: underline;
    }
    .footer__base {
      margin-top: 56px;
      padding-block: 24px;
      border-top: 1px solid var(--line);
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
  protected readonly year = new Date().getFullYear();
}
