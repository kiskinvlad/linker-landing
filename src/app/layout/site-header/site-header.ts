import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { Logo } from '../../shared/ui/logo';

@Component({
  selector: 'kit-site-header',
  imports: [RouterLink, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
  host: {
    '(window:keydown.escape)': 'menuOpen.set(false)',
  },
})
export class SiteHeader {
  protected readonly identity = inject(APP_IDENTITY);
  protected readonly menuOpen = signal(false);

  protected readonly nav = [
    { label: 'Product', fragment: 'product' },
    { label: 'Pricing', fragment: 'pricing' },
    { label: 'How it works', fragment: 'how-it-works' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }
}
