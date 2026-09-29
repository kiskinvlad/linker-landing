import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { APP_IDENTITY } from '../config/app-identity';

/** Per-route SEO, declared as `data: { seo: RouteSeo }` in the route config (plan §5). */
export interface RouteSeo {
  title: string;
  description: string;
  /** Path used for the canonical URL; defaults to the route's own URL. */
  path?: string;
  noindex?: boolean;
  /**
   * Share image slug: `public/og/<slug>.png`, rendered by
   * `scripts/render-og-images.mjs`. Defaults to `home`.
   */
  ogImage?: 'home' | 'pricing' | 'how-it-works';
  /** Structured data objects, each rendered as its own `application/ld+json` script. */
  jsonLd?: (siteUrl: string, productName: string) => object[];
}

const JSON_LD_ATTR = 'data-kit-jsonld';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly identity = inject(APP_IDENTITY);

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
    const canonical = siteUrl + (path === '/' ? '/' : path);
    const fullTitle = path === '/' ? seo.title : `${seo.title} · ${productName}`;

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
    // Absolute URLs: crawlers resolve og:image against nothing.
    const image = `${siteUrl}/og/${seo.ogImage ?? 'home'}.png`;
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(seo.noindex ? null : canonical);
    this.setJsonLd(seo.jsonLd?.(siteUrl, productName) ?? []);
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
