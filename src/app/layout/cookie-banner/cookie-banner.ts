import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentService } from '../../core/consent/consent.service';

/**
 * Cookie banner and settings in one non-blocking bottom sheet (plan §8):
 * "Accept all", "Reject all" and "Customize" carry equal visual weight, nothing is
 * pre-ticked, and the page stays usable behind it. The footer's "Cookie settings"
 * reopens it in the detailed view.
 *
 * Browser-only by construction: `bannerOpen()` is false during prerender, so the
 * banner is never baked into the static HTML (and never flashes for visitors who
 * already chose). It is `position: fixed`, so appearing can't shift layout.
 */
@Component({
  selector: 'kit-cookie-banner',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'consent.detailed() && consent.closeSettings()' },
  template: `
    @if (consent.bannerOpen()) {
      <section class="consent" role="region" aria-labelledby="consent-title">
        <div class="consent__head">
          <h2 id="consent-title" tabindex="-1" #title i18n="@@consent.title">
            Cookies on this site
          </h2>
          @if (consent.detailed()) {
            <button
              type="button"
              class="consent__close"
              (click)="consent.closeSettings()"
              i18n-aria-label="@@consent.close"
              aria-label="Close without changes"
            >
              ×
            </button>
          }
        </div>

        <p class="consent__text" i18n="@@consent.body">
          Necessary cookies keep you signed in and remember your choices. With your permission we’d
          also use Google Analytics to learn which pages help people most — nothing is sent to
          Google unless you allow it.
          <a routerLink="/legal/cookies">Cookie policy</a>
        </p>

        @if (detailedView()) {
          <ul class="consent__list">
            <li class="consent__row">
              <div>
                <p class="consent__name" i18n="@@consent.necessary.name">Necessary</p>
                <p class="consent__desc" i18n="@@consent.necessary.desc">
                  Your session, your cookie choice and your language. Always on.
                </p>
              </div>
              <input
                type="checkbox"
                role="switch"
                class="consent__switch"
                checked
                disabled
                i18n-aria-label="@@consent.necessary.name"
                aria-label="Necessary"
              />
            </li>
            <li class="consent__row">
              <div>
                <label class="consent__name" for="consent-analytics" i18n="@@consent.analytics.name"
                  >Analytics</label
                >
                <p class="consent__desc" i18n="@@consent.analytics.desc">
                  Google Analytics 4: which pages are visited and how people move through the site.
                  No ads, no cross-site tracking.
                </p>
                @if (consent.gpc()) {
                  <p class="consent__gpc" i18n="@@consent.analytics.gpc">
                    Your browser sends a Global Privacy Control signal, so analytics stays off.
                  </p>
                }
              </div>
              <input
                id="consent-analytics"
                type="checkbox"
                role="switch"
                class="consent__switch"
                [checked]="analyticsChoice()"
                [disabled]="consent.gpc()"
                (change)="analyticsChoice.set($any($event.target).checked)"
              />
            </li>
          </ul>
        }

        <div class="consent__actions">
          <button
            type="button"
            class="consent__btn"
            (click)="consent.rejectAll()"
            i18n="@@consent.rejectAll"
          >
            Reject all
          </button>
          @if (detailedView()) {
            <button
              type="button"
              class="consent__btn"
              (click)="consent.save(analyticsChoice())"
              i18n="@@consent.save"
            >
              Save choices
            </button>
          } @else {
            <button
              type="button"
              class="consent__btn"
              (click)="customizing.set(true)"
              i18n="@@consent.customize"
            >
              Customize
            </button>
          }
          <button
            type="button"
            class="consent__btn"
            (click)="consent.acceptAll()"
            i18n="@@consent.acceptAll"
          >
            Accept all
          </button>
        </div>
      </section>
    }
  `,
  styleUrl: './cookie-banner.css',
})
export class CookieBanner {
  protected readonly consent = inject(ConsentService);
  protected readonly customizing = signal(false);
  protected readonly analyticsChoice = signal(false);
  private readonly title = viewChild<ElementRef<HTMLElement>>('title');

  protected detailedView(): boolean {
    return this.customizing() || this.consent.detailed();
  }

  constructor() {
    // Reopened from the footer: start from the current choice and move focus to
    // the panel, so keyboard and screen-reader users land where they asked to go.
    effect(() => {
      if (this.consent.detailed()) {
        this.analyticsChoice.set(this.consent.analytics());
        this.title()?.nativeElement.focus();
      } else {
        this.customizing.set(false);
      }
    });
  }
}
