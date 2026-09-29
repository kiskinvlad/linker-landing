import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../ui/reveal.directive';
import { FREE_PLAN, PRO_PLAN } from './plans.content';

/** Free + "Pro — coming soon" cards, used by the home teaser and /pricing. */
@Component({
  selector: 'kit-plan-cards',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plans">
      <article class="plan plan--free" kitReveal aria-labelledby="plan-free">
        <p class="plan__badge">Available now</p>
        <h3 id="plan-free">{{ free.name }}</h3>
        <p class="plan__price">{{ free.price }} <span>/ forever</span></p>
        <ul class="plan__features">
          @for (f of free.features; track f) {
            <li>{{ f }}</li>
          }
        </ul>
        <a class="btn btn--primary plan__cta" href="/register?plan=free">Start free</a>
        <p class="plan__note">No credit card needed</p>
      </article>

      <article class="plan plan--pro" [kitReveal]="120" aria-labelledby="plan-pro">
        <p class="plan__badge plan__badge--soon">Coming soon</p>
        <h3 id="plan-pro">{{ pro.name }}</h3>
        <p class="plan__lead">{{ pro.lead }}</p>
        <ul class="plan__features plan__features--muted">
          @for (f of pro.features; track f) {
            <li>{{ f }}</li>
          }
        </ul>
      </article>
    </div>
  `,
  styleUrl: './plan-cards.css',
})
export class PlanCards {
  protected readonly free = FREE_PLAN;
  protected readonly pro = PRO_PLAN;
}
