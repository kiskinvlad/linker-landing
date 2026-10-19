import { ChangeDetectionStrategy, Component, LOCALE_ID, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { APP_IDENTITY } from '../../../core/config/app-identity';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { CocreateBand } from '../../../shared/marketing/cocreate-band';
import { CtaBand } from '../../../shared/marketing/cta-band';
import { FaqSection } from '../../../shared/marketing/faq-section';
import { PlanCards } from '../../../shared/marketing/plan-cards';
import { ANALYTICS_POINTS, AUDIENCES, BENEFITS, FAQ, USE_CASES } from './home.content';
import { Hero } from './hero/hero';
import { Steps } from './steps/steps';

@Component({
  selector: 'kit-home',
  imports: [RouterLink, Hero, Steps, PlanCards, CocreateBand, FaqSection, CtaBand, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly audiences = AUDIENCES;
  protected readonly benefits = BENEFITS;
  protected readonly analyticsPoints = ANALYTICS_POINTS;
  /** The illustration's bars, as a share of the chart's height. */
  protected readonly chartBars = [34, 42, 38, 55, 48, 62, 58, 71, 66, 80, 74, 92];
  /** The illustration's numbers, written the way this page's language writes them. */
  protected readonly mock = mockNumbers(inject(LOCALE_ID));
  protected readonly identity = inject(APP_IDENTITY);
  protected readonly session = inject(SessionStore);
  protected readonly useCases = USE_CASES;
  protected readonly faq = FAQ;
}

type MockKey = 'views' | 'ctr' | 'conversion' | 'viewsUp' | 'ctrUp' | 'conversionUp';

function mockNumbers(locale: string): Record<MockKey, string> {
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  return {
    views: new Intl.NumberFormat(locale).format(12480),
    ctr: percent.format(0.062),
    conversion: percent.format(0.021),
    // Changes against the previous period, relative, as the dashboard shows them.
    viewsUp: percent.format(0.18),
    ctrUp: percent.format(0.17),
    conversionUp: percent.format(0.24),
  };
}
