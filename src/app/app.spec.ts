import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { User } from './core/api/auth.api';
import { SessionStore } from './core/auth/session.store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the shell with a skip link, header, main landmark and footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main');
    expect(el.querySelector('header')).toBeTruthy();
    expect(el.querySelector('main#main')).toBeTruthy();
    expect(el.querySelector('footer')).toBeTruthy();
  });

  it('sends a signed-out visitor to the editor and analytics through login', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(appLinks(fixture.nativeElement)).toEqual([
      '/login?returnUrl=%2Feditor%2F',
      '/login?returnUrl=%2Fanalytics%2F',
    ]);
  });

  it('links a signed-in visitor straight to the same-origin editor app', async () => {
    TestBed.inject(SessionStore).setUser(ADA);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(appLinks(el)).toEqual(['/editor/', '/analytics/']);
    expect(el.querySelector('.account__name')?.textContent?.trim()).toBe('Ada');
    expect(el.querySelector('.header__login')).toBeNull();
  });

  it('sends an unverified visitor to confirm their email first, with a reminder', async () => {
    TestBed.inject(SessionStore).setUser({ ...ADA, emailVerified: false });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(appLinks(el)).toEqual([
      '/verify-email?returnUrl=%2Feditor%2F',
      '/verify-email?returnUrl=%2Fanalytics%2F',
    ]);
    expect(el.querySelector('.verify-banner')).not.toBeNull();
  });
});

/** The header's "Open editor" and "Analytics" pills, in order. */
function appLinks(el: HTMLElement): (string | null)[] {
  return Array.from(el.querySelectorAll('header a.open-app')).map((a) => a.getAttribute('href'));
}

const ADA: User = {
  id: '1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  company: null,
  phone: null,
  preferredLanguage: 'en',
  emailVerified: true,
  createdAt: '2026-09-30T00:00:00.000Z',
};
