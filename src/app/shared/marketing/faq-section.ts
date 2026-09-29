import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RevealDirective } from '../ui/reveal.directive';

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * FAQ as native `<details>` accordions (plan §6.7): no JS, works prerendered.
 * The matching `FAQPage` JSON-LD is the route's job — see `faqPage()` in json-ld.ts.
 */
@Component({
  selector: 'kit-faq-section',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="faq" class="section" aria-labelledby="faq-title">
      <div class="container faq">
        <div class="section-head" kitReveal>
          <p class="eyebrow">FAQ</p>
          <h2 id="faq-title">{{ heading() }}</h2>
        </div>

        <div class="faq__list">
          @for (item of items(); track item.q) {
            <details class="faq__item">
              <summary>{{ item.q }}</summary>
              <p>{{ item.a }}</p>
            </details>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './faq-section.css',
})
export class FaqSection {
  readonly items = input.required<readonly FaqItem[]>();
  readonly heading = input('Questions, answered');
}
