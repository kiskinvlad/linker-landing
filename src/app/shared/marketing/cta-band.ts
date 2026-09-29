import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RevealDirective } from '../ui/reveal.directive';

/** Closing call-to-action band that ends every marketing page (plan §6.8). */
@Component({
  selector: 'kit-cta-band',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="final" aria-labelledby="final-title">
      <div class="container final__inner" kitReveal>
        <h2 id="final-title">{{ heading() }}</h2>
        <p>{{ lead() }}</p>
        <a class="btn btn--lg final__btn" href="/register?plan=free">Start free</a>
      </div>
    </section>
  `,
  styleUrl: './cta-band.css',
})
export class CtaBand {
  readonly heading = input('Your next customer is already on your site.');
  readonly lead = input('Give them a reason to buy. Set up your first offer in minutes.');
}
