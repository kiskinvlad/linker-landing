import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { AUDIENCES, BENEFITS, FAQ, FREE_PLAN, USE_CASES } from './home.content';
import { Hero } from './hero/hero';
import { Steps } from './steps/steps';

@Component({
  selector: 'kit-home',
  imports: [Hero, Steps, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly audiences = AUDIENCES;
  protected readonly benefits = BENEFITS;
  protected readonly useCases = USE_CASES;
  protected readonly freePlan = FREE_PLAN;
  protected readonly faq = FAQ;
}
