import { DOCUMENT, DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ConsentLoader } from './consent.model';

/** Analytics settings. GA4 is disabled entirely while the measurement ID is null. */
export interface AnalyticsConfig {
  /** GA4 measurement ID, e.g. `G-XXXXXXXXXX`. */
  ga4MeasurementId: string | null;
}

export const ANALYTICS_CONFIG = new InjectionToken<AnalyticsConfig>('ANALYTICS_CONFIG', {
  providedIn: 'root',
  // No property yet: the loader is a no-op until an ID is configured here.
  factory: () => ({ ga4MeasurementId: null }),
});

type Gtag = (...args: unknown[]) => void;
interface GtagWindow extends Window {
  dataLayer?: unknown[];
  gtag?: Gtag;
  [disableFlag: `ga-disable-${string}`]: boolean | undefined;
}

/**
 * Google Analytics 4 in strict consent mode (plan §8):
 *
 * 1. src/index.html sets `gtag('consent', 'default', { …: 'denied' })` before
 *    anything else runs.
 * 2. gtag.js is NOT requested until analytics is granted — no request reaches
 *    Google before that. CI checks no prerendered page references it.
 * 3. On grant: inject gtag.js, update consent, configure without automatic page
 *    views, Google signals or ad personalisation.
 * 4. Page views come from router navigations (`send_page_view: false`), with the
 *    URL's query string and hash stripped — later pages carry tokens there.
 * 5. On withdrawal: deny consent, set GA's own kill switch, delete `_ga*` cookies.
 *
 * Portal only (D11): the editor bundle carries none of this.
 */
@Injectable({ providedIn: 'root' })
export class Ga4Loader implements ConsentLoader {
  readonly category = 'analytics' as const;

  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly id = inject(ANALYTICS_CONFIG).ga4MeasurementId;
  private pageViews: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pageViews?.unsubscribe());
  }

  grant(): void {
    const win = this.window;
    if (!this.id || !win) return;

    const gtag = this.gtag(win);
    win[`ga-disable-${this.id}`] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });

    if (!this.document.querySelector('script[data-kit-ga4]')) {
      const script = this.document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.id)}`;
      script.setAttribute('data-kit-ga4', '');
      this.document.head.appendChild(script);
      gtag('js', new Date());
      gtag('config', this.id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }

    this.sendPageView(gtag);
    this.pageViews ??= this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.sendPageView(gtag));
  }

  revoke(): void {
    const win = this.window;
    if (!this.id || !win) return;

    this.pageViews?.unsubscribe();
    this.pageViews = null;
    win[`ga-disable-${this.id}`] = true;
    this.gtag(win)('consent', 'update', { analytics_storage: 'denied' });
    this.deleteGaCookies();
  }

  private get window(): GtagWindow | null {
    return this.document.defaultView as GtagWindow | null;
  }

  /** index.html defines gtag; fall back to the same one-liner if it didn't. */
  private gtag(win: GtagWindow): Gtag {
    if (!win.gtag) {
      win.dataLayer = win.dataLayer ?? [];
      win.gtag = function gtag() {
        // gtag.js reads the raw `arguments` object, not an array.
        // oxlint-disable-next-line prefer-rest-params
        win.dataLayer!.push(arguments);
      };
    }
    return win.gtag;
  }

  private sendPageView(gtag: Gtag): void {
    const loc = this.document.location;
    gtag('event', 'page_view', {
      page_location: loc.origin + loc.pathname,
      page_title: this.document.title,
    });
  }

  /** `_ga` and `_ga_<container>` are set on the site's registrable domain. */
  private deleteGaCookies(): void {
    const host = this.document.location.hostname;
    const parts = host.split('.');
    const domains = ['', host, parts.length > 1 ? `.${parts.slice(-2).join('.')}` : ''];
    const names = this.document.cookie
      .split(';')
      .map((c) => c.split('=')[0].trim())
      .filter((name) => name === '_ga' || name.startsWith('_ga_'));
    for (const name of names) {
      for (const domain of new Set(domains)) {
        this.document.cookie = `${name}=; Path=/; Max-Age=0` + (domain ? `; Domain=${domain}` : '');
      }
    }
  }
}
