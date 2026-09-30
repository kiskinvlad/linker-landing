import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
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

  it('sends a signed-out visitor to the editor through login', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.open-editor');
    expect(link?.getAttribute('href')).toBe('/login?returnUrl=%2Feditor%2F');
  });

  it('links a signed-in visitor straight to the same-origin editor app', async () => {
    TestBed.inject(SessionStore).setUser({
      id: '1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      company: null,
      phone: null,
      preferredLanguage: 'en',
      createdAt: '2026-09-30T00:00:00.000Z',
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a.open-editor')?.getAttribute('href')).toBe('/editor/');
    expect(el.querySelector('.account__name')?.textContent?.trim()).toBe('Ada');
    expect(el.querySelector('.header__login')).toBeNull();
  });
});
