import { ChangeDetectionStrategy, Component, DOCUMENT, LOCALE_ID, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { LANG_COOKIE, LOCALES, localeById } from '../../core/i18n/locales';

/**
 * EN / UA switcher. Each language is its own build, so these are plain links to
 * the same page under the other prefix — a full navigation, not a router one.
 * Clicking records the choice, which then outranks the browser's language.
 */
@Component({
  selector: 'kit-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="langs" i18n-aria-label="@@nav.language" aria-label="Language">
      @for (l of locales; track l.id) {
        <li>
          @if (l.id === current.id) {
            <span class="langs__item is-current" [attr.lang]="l.id" aria-current="true">
              <abbr [title]="l.nativeName">{{ l.label }}</abbr>
            </span>
          } @else {
            <a
              class="langs__item"
              [href]="l.prefix + path()"
              [attr.hreflang]="l.id"
              [attr.lang]="l.id"
              (click)="remember(l.id)"
            >
              <abbr [title]="l.nativeName">{{ l.label }}</abbr>
            </a>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    .langs {
      display: inline-flex;
      gap: 2px;
      margin: 0;
      padding: 3px;
      list-style: none;
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      background: var(--panel);
    }
    .langs__item {
      display: block;
      min-width: 36px;
      padding: 5px 9px;
      border-radius: var(--radius-pill);
      font: 600 0.8125rem/1 var(--font-mono);
      text-align: center;
      text-decoration: none;
      color: var(--ink-2);
    }
    a.langs__item:hover {
      color: var(--ink);
      background: var(--bg-soft);
    }
    .is-current {
      background: var(--ink);
      color: var(--bg);
    }
    abbr {
      text-decoration: none;
    }
  `,
})
export class LanguageSwitcher {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  protected readonly locales = LOCALES;
  protected readonly current = localeById(inject(LOCALE_ID));

  /** The current page's path inside the app, so switching keeps the visitor on it. */
  protected readonly path = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected remember(id: string): void {
    const year = 60 * 60 * 24 * 365;
    const secure = this.document.location.protocol === 'https:' ? '; Secure' : '';
    this.document.cookie = `${LANG_COOKIE}=${id}; Path=/; Max-Age=${year}; SameSite=Lax${secure}`;
  }
}
