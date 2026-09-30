import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { localeById } from '../../core/i18n/locales';
import { LEGAL_DOCS, LEGAL_TEXTS_FINAL, LegalDoc } from './legal.content';
import { RenderedLegalDoc } from './legal-markdown';

/**
 * One legal document. The text arrives rendered from `legalDocResolver`, so it is
 * in the prerendered HTML; this component adds the frame: version, table of
 * contents, notices and links to the other documents.
 */
@Component({
  selector: 'kit-legal-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc(); as doc) {
      <header class="page-hero">
        <div class="container">
          <p class="eyebrow">
            <a routerLink="/legal" i18n="@@legal.hub.eyebrow">Legal center</a>
          </p>
          <h1>{{ doc.title }}</h1>
          <p class="legal__meta" i18n="@@legal.meta">
            Version {{ doc.version }} · Effective {{ effective() }}
          </p>
        </div>
      </header>

      <section class="section legal">
        <div class="container legal__layout">
          @if (rendered()?.toc; as toc) {
            <nav class="legal__toc" i18n-aria-label="@@legal.toc" aria-label="On this page">
              <h2 class="legal__toc-title" i18n="@@legal.toc">On this page</h2>
              <ol>
                @for (h of toc; track h.id) {
                  <li>
                    <a [routerLink]="[]" [fragment]="h.id">{{ h.text }}</a>
                  </li>
                }
              </ol>
            </nav>
          }

          <article class="prose legal__body">
            @if (!final) {
              <p class="legal__notice" role="note" i18n="@@legal.draft">
                Draft. This document takes effect when {{ identity.productName }} launches; contact
                addresses shown here are placeholders until then.
              </p>
            }
            @if (!english) {
              <p class="legal__notice" role="note" i18n="@@legal.englishOnly">
                Legal documents are published in English. The English text is the binding version.
              </p>
            }
            <!-- Rendered from our own Markdown by legal-markdown.ts, which escapes all
                 text and allows only same-site, https and mailto links. -->
            <div
              class="legal__text"
              lang="en"
              [innerHTML]="html()"
              (click)="followLink($event)"
            ></div>
          </article>
        </div>

        <nav
          class="container legal__others"
          i18n-aria-label="@@legal.others"
          aria-label="Other legal documents"
        >
          <h2 class="legal__toc-title" i18n="@@legal.others">Other legal documents</h2>
          <ul>
            @for (other of others(); track other.slug) {
              <li>
                <a [routerLink]="['/legal', other.slug]">{{ other.title }}</a>
              </li>
            }
          </ul>
        </nav>
      </section>
    }
  `,
  styles: `
    .legal {
      padding-top: 0;
    }
    /* Outranks the global .page-hero p:not(.eyebrow) lead style. */
    .page-hero .legal__meta {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--ink-3);
    }
    .legal__layout {
      display: grid;
      grid-template-columns: minmax(200px, 260px) minmax(0, 1fr);
      gap: 56px;
      align-items: start;
    }
    .legal__toc {
      position: sticky;
      top: 96px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      font-size: 0.875rem;
    }
    .legal__toc-title {
      margin: 0 0 12px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 400;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-3);
    }
    .legal__toc ol,
    .legal__others ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }
    .legal__toc a,
    .legal__others a {
      color: var(--ink-2);
      text-decoration: none;
    }
    .legal__toc a:hover,
    .legal__others a:hover {
      color: var(--ink);
      text-decoration: underline;
    }
    .legal__body {
      margin-inline: 0;
    }
    .legal__notice {
      margin-bottom: 24px;
      padding: 16px 20px;
      border: 1px solid var(--border);
      border-left: 4px solid var(--spark);
      border-radius: var(--radius-sm);
      background: var(--spark-soft);
      color: var(--ink);
    }
    .legal__others {
      margin-top: 64px;
      padding-top: 32px;
      border-top: 1px solid var(--border);
    }
    .legal__others ul {
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }

    /* The document body is innerHTML, outside this component's view encapsulation. */
    .legal__text ::ng-deep h2 {
      scroll-margin-top: 96px;
    }
    .legal__text ::ng-deep h3 {
      margin: 28px 0 10px;
      font-size: 1.125rem;
    }
    .legal__text ::ng-deep :is(ul, ol) {
      display: grid;
      gap: 8px;
      margin: 12px 0 16px;
      padding-left: 22px;
    }
    .legal__text ::ng-deep :is(p, ul, ol, .legal-table) + p {
      margin-top: 16px;
    }
    .legal__text ::ng-deep code {
      font-family: var(--font-mono);
      font-size: 0.875em;
      overflow-wrap: anywhere;
    }
    .legal__text ::ng-deep .legal-table {
      margin: 16px 0 24px;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
    .legal__text ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9375rem;
    }
    .legal__text ::ng-deep :is(th, td) {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
      color: var(--ink-2);
    }
    .legal__text ::ng-deep th {
      background: var(--bg-2);
      color: var(--ink);
      font-weight: 600;
    }
    .legal__text ::ng-deep tr:last-child td {
      border-bottom: 0;
    }

    @media (max-width: 900px) {
      .legal__layout {
        /* minmax(0, …), not 1fr: a 1fr track grows to the widest table's min-content
           and widens the whole page, instead of letting .legal-table scroll. */
        grid-template-columns: minmax(0, 1fr);
        gap: 32px;
      }
      .legal__toc {
        position: static;
        max-height: none;
        padding: 16px 20px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-2);
      }
    }
  `,
})
export class LegalPage {
  protected readonly identity = inject(APP_IDENTITY);
  protected readonly final = LEGAL_TEXTS_FINAL;
  private readonly localeId = inject(LOCALE_ID);
  private readonly locale = localeById(this.localeId);
  protected readonly english = this.locale.id === 'en';
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly data = inject(ActivatedRoute).data;

  protected readonly doc = toSignal(this.data.pipe(map((d) => d['doc'] as LegalDoc)));
  protected readonly rendered = toSignal(
    this.data.pipe(map((d) => d['rendered'] as RenderedLegalDoc)),
  );

  // Trusted: produced at build time from our own Markdown by an escaping renderer
  // (legal-markdown.ts). Angular's sanitizer would strip the heading ids the table
  // of contents links to.
  protected readonly html = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.rendered()?.html ?? ''),
  );

  protected readonly others = computed(() => LEGAL_DOCS.filter((d) => d.slug !== this.doc()?.slug));

  protected readonly effective = computed(() => {
    const version = this.doc()?.version;
    // UTC so a date-only version never shows as the previous day west of Greenwich.
    return version
      ? new Intl.DateTimeFormat(this.localeId, { dateStyle: 'long', timeZone: 'UTC' }).format(
          new Date(version),
        )
      : '';
  });

  /**
   * Links inside the document are plain `<a href>` (it is innerHTML). Route the
   * same-language ones through the router, so moving between documents stays a
   * client-side navigation; anything else keeps the browser's default.
   */
  protected followLink(event: MouseEvent): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const href = (event.target as Element | null)?.closest('a')?.getAttribute('href');
    const prefix = this.locale.prefix;
    if (!href?.startsWith(`${prefix}/`) || href.startsWith('//')) return;
    event.preventDefault();
    void this.router.navigateByUrl(href.slice(prefix.length));
  }
}
