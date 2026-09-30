import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { Logo } from '../../shared/ui/logo';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

@Component({
  selector: 'kit-site-header',
  imports: [RouterLink, RouterLinkActive, Logo, LanguageSwitcher],
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

  protected readonly nav: { label: string; link: string; fragment?: string }[] = [
    { label: $localize`:@@nav.product:Product`, link: '/', fragment: 'product' },
    { label: $localize`:@@nav.pricing:Pricing`, link: '/pricing' },
    { label: $localize`:@@nav.howItWorks:How it works`, link: '/how-it-works' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }
}
