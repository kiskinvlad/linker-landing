import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '../../core/api/auth.api';
import { AuthFacade } from '../../core/auth/auth.facade';
import { SessionStore } from '../../core/auth/session.store';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { Ga4Loader } from '../../core/consent/ga4.loader';
import { Logo } from '../../shared/ui/logo';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

@Component({
  selector: 'kit-site-header',
  imports: [RouterLink, RouterLinkActive, Logo, LanguageSwitcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
  host: {
    '(window:keydown.escape)': 'menuOpen.set(false); accountOpen.set(false)',
    '(document:click)': 'closeAccountOnOutsideClick($event)',
  },
})
export class SiteHeader {
  protected readonly identity = inject(APP_IDENTITY);
  protected readonly session = inject(SessionStore);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly ga = inject(Ga4Loader);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly menuOpen = signal(false);
  protected readonly accountOpen = signal(false);

  protected readonly nav: { label: string; link: string; fragment?: string }[] = [
    { label: $localize`:@@nav.product:Product`, link: '/', fragment: 'product' },
    { label: $localize`:@@nav.pricing:Pricing`, link: '/pricing' },
    { label: $localize`:@@nav.howItWorks:How it works`, link: '/how-it-works' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected initials(user: User): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  protected openEditorClicked(): void {
    this.ga.event('open_editor_click');
  }

  protected async logout(): Promise<void> {
    this.accountOpen.set(false);
    this.menuOpen.set(false);
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }

  protected closeAccountOnOutsideClick(event: MouseEvent): void {
    if (!this.accountOpen()) return;
    const account = this.host.nativeElement.querySelector('.account');
    if (account && !account.contains(event.target as Node)) this.accountOpen.set(false);
  }
}
