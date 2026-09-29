import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { CocreateBand } from '../../../shared/marketing/cocreate-band';
import { CtaBand } from '../../../shared/marketing/cta-band';
import { FaqSection } from '../../../shared/marketing/faq-section';
import { PlanCards } from '../../../shared/marketing/plan-cards';
import { AUDIENCES, BENEFITS, FAQ, USE_CASES } from './home.content';
import { Hero } from './hero/hero';
import { Steps } from './steps/steps';

@Component({
  selector: 'kit-home',
  imports: [Hero, Steps, PlanCards, CocreateBand, FaqSection, CtaBand, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly audiences = AUDIENCES;
  protected readonly benefits = BENEFITS;
  protected readonly useCases = USE_CASES;
  protected readonly faq = FAQ;
}
