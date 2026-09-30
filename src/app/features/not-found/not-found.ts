import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kit-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section nf" aria-labelledby="nf-title">
      <div class="container">
        <p class="eyebrow">404</p>
        <h1 id="nf-title" i18n="@@notFound.title">This page wandered off.</h1>
        <p class="nf__lead" i18n="@@notFound.lead">
          The link may be broken, or the page may have moved.
        </p>
        <a class="btn btn--primary" routerLink="/" i18n="@@common.backHome">Back to home</a>
      </div>
    </section>
  `,
  styles: `
    .nf {
      min-height: 60vh;
      display: grid;
      align-items: center;
      text-align: center;
    }
    .nf__lead {
      margin: 16px 0 32px;
      color: var(--ink-2);
      font-size: 1.125rem;
    }
  `,
})
export class NotFound {}
