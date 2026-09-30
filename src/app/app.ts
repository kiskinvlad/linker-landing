import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/seo/seo.service';
import { CookieBanner } from './layout/cookie-banner/cookie-banner';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

/** Portal shell: header, routed page, footer, cookie banner. */
@Component({
  selector: 'kit-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, CookieBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main" i18n="@@nav.skipToContent">Skip to content</a>
    <kit-site-header />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <kit-site-footer />
    <kit-cookie-banner />
  `,
  styles: `
    main:focus {
      outline: none;
    }
  `,
})
export class App {
  constructor() {
    inject(SeoService).init();
  }
}
