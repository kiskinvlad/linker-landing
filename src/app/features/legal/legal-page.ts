import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { LegalDoc } from './legal.content';

/** Placeholder for a legal document until its text lands in milestone M7. */
@Component({
  selector: 'kit-legal-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc(); as doc) {
      <header class="page-hero">
        <div class="container">
          <p class="eyebrow" i18n="@@footer.legal">Legal</p>
          <h1>{{ doc.title }}</h1>
        </div>
      </header>

      <section class="section legal">
        <div class="container prose">
          <p class="legal__notice" role="note" i18n="@@legal.notice">
            This document is being prepared and will be published here before
            {{ identity.productName }} launches.
          </p>

          <h2 i18n="@@legal.coversTitle">What it will cover</h2>
          <ul>
            @for (item of doc.covers; track item) {
              <li>{{ item }}</li>
            }
          </ul>

          <p class="legal__back"><a routerLink="/" i18n="@@common.backHome">Back to home</a></p>
        </div>
      </section>
    }
  `,
  styles: `
    .legal {
      padding-top: 0;
    }
    .legal__notice {
      padding: 16px 20px;
      border: 1px solid var(--line);
      border-left: 4px solid var(--spark);
      border-radius: var(--radius-sm);
      background: var(--spark-soft);
      color: var(--ink);
    }
    ul {
      display: grid;
      gap: 8px;
      padding-left: 20px;
    }
    .legal__back {
      margin-top: 40px;
    }
  `,
})
export class LegalPage {
  protected readonly identity = inject(APP_IDENTITY);
  protected readonly doc = toSignal(
    inject(ActivatedRoute).data.pipe(map((d) => d['doc'] as LegalDoc)),
  );
}
