import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageSwitcher } from './language-switcher';

function render(localeId: string): HTMLElement {
  TestBed.configureTestingModule({
    imports: [LanguageSwitcher],
    providers: [provideRouter([]), { provide: LOCALE_ID, useValue: localeId }],
  });
  const fixture = TestBed.createComponent(LanguageSwitcher);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('LanguageSwitcher', () => {
  afterEach(() => {
    document.cookie = 'kit_lang=; Path=/; Max-Age=0';
  });

  it('marks English as current on the English build and links to the /ua/ page', () => {
    const el = render('en');
    expect(el.querySelector('[aria-current="true"]')?.textContent?.trim()).toBe('EN');
    const ua = el.querySelector<HTMLAnchorElement>('a[hreflang="uk"]');
    expect(ua?.getAttribute('href')).toBe('/ua/');
    expect(ua?.textContent?.trim()).toBe('UA');
  });

  it('links back to the unprefixed page from the Ukrainian build', () => {
    const el = render('uk');
    expect(el.querySelector('[aria-current="true"]')?.textContent?.trim()).toBe('UA');
    expect(el.querySelector('a[hreflang="en"]')?.getAttribute('href')).toBe('/');
  });

  it('remembers an explicit choice, which then outranks the browser language', () => {
    const el = render('en');
    const ua = el.querySelector<HTMLAnchorElement>('a[hreflang="uk"]')!;
    ua.addEventListener('click', (e) => e.preventDefault()); // stay on the test page
    ua.click();
    expect(document.cookie).toContain('kit_lang=uk');
  });
});
