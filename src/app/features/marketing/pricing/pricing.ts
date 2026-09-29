import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CocreateBand } from '../../../shared/marketing/cocreate-band';
import { CtaBand } from '../../../shared/marketing/cta-band';
import { FaqSection } from '../../../shared/marketing/faq-section';
import { PlanCards } from '../../../shared/marketing/plan-cards';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { INCLUDED, PRICING_FAQ } from './pricing.content';

@Component({
  selector: 'kit-pricing',
  imports: [PlanCards, CocreateBand, FaqSection, CtaBand, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-hero">
      <div class="container">
        <p class="eyebrow" i18n="@@nav.pricing">Pricing</p>
        <h1 i18n="@@pricing.title">Start free. Upgrade when it pays for itself.</h1>
        <p i18n="@@pricing.lead">
          The Free plan is free for good, not a trial. Build, publish and measure a real offer
          before you spend anything.
        </p>
      </div>
    </header>

    <section class="section plans-section" aria-labelledby="plans-title">
      <div class="container">
        <!-- Keeps the outline h1 → h2 → h3; the plan cards' names are h3. -->
        <h2 id="plans-title" class="visually-hidden" i18n="@@pricing.plansHeading">Plans</h2>
        <kit-plan-cards />
      </div>
    </section>

    <section class="section section--soft" aria-labelledby="included-title">
      <div class="container">
        <div class="section-head section-head--center" kitReveal>
          <p class="eyebrow" i18n="@@pricing.included.eyebrow">Every plan</p>
          <h2 id="included-title" i18n="@@pricing.included.title">
            Included on every plan, Free too
          </h2>
        </div>
        <ul class="included">
          @for (item of included; track item.title; let i = $index) {
            <li [kitReveal]="i * 80">
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </li>
          }
        </ul>
      </div>
    </section>

    <kit-cocreate-band />
    <kit-faq-section [items]="faq" i18n-heading="@@pricing.faq.title" heading="Pricing questions" />
    <kit-cta-band i18n-heading="@@pricing.cta.title" heading="Your first offer is free." />
  `,
  styles: `
    .plans-section {
      padding-top: 0;
    }
    .included {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .included li {
      padding: 24px;
      border: 1px solid var(--line);
      border-top: 3px solid var(--accent);
      border-radius: var(--radius);
      background: var(--panel);
    }
    .included p {
      margin-top: 8px;
      color: var(--ink-2);
      font-size: 0.9688rem;
    }
    @media (max-width: 1000px) {
      .included {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 560px) {
      .included {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Pricing {
  protected readonly included = INCLUDED;
  protected readonly faq = PRICING_FAQ;
}
