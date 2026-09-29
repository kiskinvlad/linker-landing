import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/ui/reveal.directive';
import { STEPS } from '../home.content';

/**
 * How it works (plan §6.3): Design → Publish → Measure, each with a small looping
 * inline-SVG vignette. Every loop ends on its "done" frame, which is also the
 * frame reduced-motion users see.
 */
@Component({
  selector: 'kit-steps',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './steps.html',
  styleUrl: './steps.css',
})
export class Steps {
  protected readonly steps = STEPS;
}
