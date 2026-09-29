import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CocreateBand } from '../../../shared/marketing/cocreate-band';
import { CtaBand } from '../../../shared/marketing/cta-band';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { GUIDE_STEPS } from './how-it-works.content';

@Component({
  selector: 'kit-how-it-works',
  imports: [CocreateBand, CtaBand, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-hero">
      <div class="container">
        <p class="eyebrow" i18n="@@nav.howItWorks">How it works</p>
        <h1 i18n="@@guide.title">From sign-up to a live offer in six steps</h1>
        <p i18n="@@guide.lead">
          No developer, no theme edits. The only technical step is pasting one snippet, once.
        </p>
      </div>
    </header>

    <section
      class="section guide-section"
      i18n-aria-label="@@guide.listLabel"
      aria-label="Step-by-step guide"
    >
      <div class="container">
        <ol class="guide">
          @for (step of steps; track step.title; let i = $index) {
            <li class="guide__step" kitReveal>
              <span class="guide__n" aria-hidden="true">{{ i + 1 }}</span>
              <article class="guide__card" [attr.aria-labelledby]="'step-' + i">
                <h2 [id]="'step-' + i">{{ step.title }}</h2>
                <p>{{ step.body }}</p>
                <ul>
                  @for (point of step.points; track point) {
                    <li>{{ point }}</li>
                  }
                </ul>
              </article>
            </li>
          }
        </ol>
      </div>
    </section>

    <kit-cocreate-band />
    <kit-cta-band
      i18n-heading="@@guide.cta.title"
      heading="Ready for step one?"
      i18n-lead="@@guide.cta.lead"
      lead="Create your free account and publish your first offer today."
    />
  `,
  styles: `
    .guide-section {
      padding-top: 0;
    }
    .guide {
      position: relative;
      max-width: 820px;
      margin: 0 auto;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 20px;
    }
    /* The rail connecting the step numbers. */
    .guide::before {
      content: '';
      position: absolute;
      left: 23px;
      top: 24px;
      bottom: 24px;
      width: 2px;
      background: linear-gradient(var(--accent), var(--spark));
      opacity: 0.35;
    }
    .guide__step {
      position: relative;
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 20px;
    }
    .guide__n {
      z-index: 1;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--accent);
      color: var(--on-accent);
      font: 600 1.125rem var(--font-mono);
      box-shadow: 0 0 0 6px var(--bg);
    }
    .guide__card {
      padding: 24px 28px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .guide__card h2 {
      font-size: 1.5rem;
    }
    .guide__card > p {
      margin-top: 8px;
      color: var(--ink-2);
    }
    .guide__card ul {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0 0;
      padding: 0;
      list-style: none;
    }
    .guide__card li {
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      background: var(--accent-soft);
      color: var(--ink-2);
      font-size: 0.875rem;
    }
    @media (max-width: 560px) {
      .guide__step {
        grid-template-columns: 36px 1fr;
        gap: 12px;
      }
      .guide__n {
        width: 36px;
        height: 36px;
        font-size: 0.9375rem;
      }
      .guide::before {
        left: 17px;
      }
      .guide__card {
        padding: 20px;
      }
    }
  `,
})
export class HowItWorks {
  protected readonly steps = GUIDE_STEPS;
}
