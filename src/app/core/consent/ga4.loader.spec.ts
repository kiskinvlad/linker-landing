import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ANALYTICS_CONFIG, Ga4Loader } from './ga4.loader';

type GtagWindow = { dataLayer?: unknown[]; gtag?: unknown; [k: string]: unknown };
const gw = () => window as unknown as GtagWindow;

function create(id: string | null): Ga4Loader {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ANALYTICS_CONFIG, useValue: { ga4MeasurementId: id } },
    ],
  });
  return TestBed.inject(Ga4Loader);
}

const gtagScripts = () =>
  document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length;

describe('Ga4Loader', () => {
  beforeEach(() => {
    document.querySelectorAll('script[data-kit-ga4]').forEach((s) => s.remove());
    const win = gw();
    win.dataLayer = [];
    delete win.gtag;
  });

  it('requests nothing from Google until granted', () => {
    create('G-TEST123');
    expect(gtagScripts()).toBe(0);
  });

  it('on grant, loads gtag.js once, updates consent and sends a page view without query or hash', () => {
    const loader = create('G-TEST123');
    history.replaceState(null, '', '/pricing?token=secret#faq');
    loader.grant();
    loader.grant();
    expect(gtagScripts()).toBe(1);
    const calls = gw().dataLayer!.map((a) => Array.from(a as ArrayLike<unknown>));
    expect(calls).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    expect(calls).toContainEqual([
      'config',
      'G-TEST123',
      {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    ]);
    const pageView = calls.find((c) => c[0] === 'event' && c[1] === 'page_view');
    expect((pageView![2] as { page_location: string }).page_location).toBe(
      `${location.origin}/pricing`,
    );
  });

  it('on revoke, denies consent, sets the kill switch and deletes _ga cookies', () => {
    const loader = create('G-TEST123');
    loader.grant();
    document.cookie = '_ga=GA1.1.1; Path=/';
    document.cookie = '_ga_TEST123=GS1.1; Path=/';
    loader.revoke();
    const win = gw();
    expect(win['ga-disable-G-TEST123']).toBe(true);
    const calls = win.dataLayer!.map((a) => Array.from(a as ArrayLike<unknown>));
    expect(calls).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect(document.cookie).not.toMatch(/_ga/);
  });

  it('does nothing at all without a measurement ID', () => {
    const loader = create(null);
    loader.grant();
    expect(gtagScripts()).toBe(0);
    expect(gw().dataLayer).toEqual([]);
  });
});
