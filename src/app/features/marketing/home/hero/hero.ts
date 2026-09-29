import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Hero (plan §6.1): positioning is selling, not widget-building. The visual is a
 * promo offer snapping onto a store page, drawn in HTML/CSS so it ships as part of
 * the prerendered markup with zero image weight.
 */
@Component({
  selector: 'kit-hero',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {}
