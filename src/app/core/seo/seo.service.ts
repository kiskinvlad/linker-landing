import { DOCUMENT, Injectable, LOCALE_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { APP_IDENTITY } from '../config/app-identity';
import { DEFAULT_LOCALE, LOCALES, localeById } from '../i18n/locales';

/** Per-route SEO, declared as `data: { seo: RouteSeo }` in the route config (plan §5). */
export interface RouteSeo {
  /** A function when the title names the product, so the name comes from APP_IDENTITY. */
  title: string | ((productName: string) => string);
  description: string;
  /** Path used for the canonical URL; defaults to the route's own URL. */
  path?: string;
  noindex?: boolean;
  /**
   * Share image slug: `public/og/<slug>.<locale>.png`, rendered per language by
   * `scripts/render-og-images.mjs`. Defaults to `home`.
   */
  ogImage?: 'home' | 'pricing' | 'how-it-works';
  /**
   * Structured data objects, each rendered as its own `application/ld+json` script.
   * `siteUrl` is this language's root (e.g. `https://…/ua`), so URLs built from it
   * stay in the page's language.
   */
  jsonLd?: (siteUrl: string, productName: string) => object[];
}

const JSON_LD_ATTR = 'data-kit-jsonld';
const ALTERNATE_ATTR = 'data-kit-alternate';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly identity = inject(APP_IDENTITY);
  private readonly locale = localeById(inject(LOCALE_ID));

  /** Applies the deepest route's SEO data after every navigation, prerender included. */
  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const seo = this.deepestSeo(this.router.routerState.snapshot.root);
        if (seo) {
          this.apply(seo, e.urlAfterRedirects);
        }
      });
  }

  apply(seo: RouteSeo, url: string): void {
    const { productName, siteUrl } = this.identity;
    const path = seo.path ?? url.split(/[?#]/)[0];
    // Each language is its own build under its own prefix; the router's URL is
    // relative to it, so the same `path` names the page in every language.
    const urlFor = (prefix: string) => siteUrl + prefix + (path === '/' ? '/' : path);
    const canonical = urlFor(this.locale.prefix);
    const title = typeof seo.title === 'function' ? seo.title(productName) : seo.title;
    const fullTitle = path === '/' ? title : `${title} · ${productName}`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({
      name: 'robots',
      content: seo.noindex ? 'noindex, nofollow' : 'index, follow',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: productName });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:locale', content: this.locale.ogLocale });
    // Absolute URLs: crawlers resolve og:image against nothing. Images live at the
    // site root (public/ is copied into every language build), one per language.
    const image = `${siteUrl}/og/${seo.ogImage ?? 'home'}.${this.locale.id}.png`;
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(seo.noindex ? null : canonical);
    this.setAlternates(
      seo.noindex
        ? []
        : [
            ...LOCALES.map((l) => ({ hreflang: l.id as string, href: urlFor(l.prefix) })),
            { hreflang: 'x-default', href: urlFor(DEFAULT_LOCALE.prefix) },
          ],
    );
    this.setJsonLd(seo.jsonLd?.(siteUrl + this.locale.prefix, productName) ?? []);
  }

  private deepestSeo(route: ActivatedRouteSnapshot): RouteSeo | undefined {
    let seo: RouteSeo | undefined;
    for (let r: ActivatedRouteSnapshot | null = route; r; r = r.firstChild) {
      seo = (r.data['seo'] as RouteSeo | undefined) ?? seo;
    }
    return seo;
  }

  private setCanonical(href: string | null): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      head.appendChild(link);
    }
    link.href = href;
  }

  /** `<link rel="alternate" hreflang>` for every language, itself included. */
  private setAlternates(links: { hreflang: string; href: string }[]): void {
    const head = this.document.head;
    head.querySelectorAll(`link[${ALTERNATE_ATTR}]`).forEach((l) => l.remove());
    for (const { hreflang, href } of links) {
      const link = this.document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = hreflang;
      link.href = href;
      link.setAttribute(ALTERNATE_ATTR, '');
      head.appendChild(link);
    }
  }

  private setJsonLd(items: object[]): void {
    const head = this.document.head;
    head.querySelectorAll(`script[${JSON_LD_ATTR}]`).forEach((s) => s.remove());
    for (const item of items) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(JSON_LD_ATTR, '');
      // `<` is escaped so no string inside the data can close the script element.
      script.textContent = JSON.stringify(item).replace(/</g, '\\u003c');
      head.appendChild(script);
    }
  }
}
