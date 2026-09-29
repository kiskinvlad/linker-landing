import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { RevealDirective } from '../ui/reveal.directive';

/**
 * "Build Kitlet with us" band (plan §10a). The wording is deliberately no bigger
 * than the promise: only paid-plan features are unlocked, never limits.
 */
@Component({
  selector: 'kit-cocreate-band',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section cocreate" aria-labelledby="cocreate-title">
      <div class="container">
        <div class="cocreate__card" kitReveal>
          <div>
            <p class="eyebrow cocreate__eyebrow" i18n="@@cocreate.eyebrow">
              Build {{ identity.productName }} with us
            </p>
            <h2 id="cocreate-title" i18n="@@cocreate.title">
              Suggest a feature. If it ships in a paid plan, it’s yours for free.
            </h2>
            <p class="cocreate__body" i18n="@@cocreate.body">
              Tell us what would help you sell more. If we build it as a paid-plan feature, we
              unlock it on your account at no cost, on any plan, for as long as your account is
              active. Everything else we ship reaches everyone anyway.
            </p>
          </div>
          <ol
            class="cocreate__flow"
            i18n-aria-label="@@cocreate.flowLabel"
            aria-label="How the idea reward works"
          >
            <li>
              <span>1</span> <ng-container i18n="@@cocreate.step1">You suggest it</ng-container>
            </li>
            <li><span>2</span> <ng-container i18n="@@cocreate.step2">We build it</ng-container></li>
            <li>
              <span>3</span>
              <ng-container i18n="@@cocreate.step3">It’s unlocked for you</ng-container>
            </li>
          </ol>
        </div>
      </div>
    </section>
  `,
  styleUrl: './cocreate-band.css',
})
export class CocreateBand {
  protected readonly identity = inject(APP_IDENTITY);
}
