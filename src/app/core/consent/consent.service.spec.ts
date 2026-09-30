import { TestBed } from '@angular/core/testing';
import {
  CONSENT_COOKIE,
  CONSENT_LOADERS,
  CONSENT_POLICY_VERSION,
  ConsentLoader,
} from './consent.model';
import { ConsentService } from './consent.service';

function clearCookies(): void {
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

function setGpc(on: boolean | undefined): void {
  Object.defineProperty(navigator, 'globalPrivacyControl', { value: on, configurable: true });
}

function create(version = 1): {
  service: ConsentService;
  loader: ConsentLoader & { calls: string[] };
} {
  const calls: string[] = [];
  const loader = {
    category: 'analytics' as const,
    calls,
    grant: () => calls.push('grant'),
    revoke: () => calls.push('revoke'),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: CONSENT_LOADERS, useValue: [loader] },
      { provide: CONSENT_POLICY_VERSION, useValue: version },
    ],
  });
  const service = TestBed.inject(ConsentService);
  TestBed.tick();
  return { service, loader };
}

describe('ConsentService', () => {
  beforeEach(() => {
    clearCookies();
    setGpc(undefined);
  });

  it('asks on a first visit, with analytics off and nothing loaded', () => {
    const { service, loader } = create();
    expect(service.bannerOpen()).toBe(true);
    expect(service.analytics()).toBe(false);
    expect(loader.calls).toEqual([]);
  });

  it('accepting all stores the choice, closes the banner and loads analytics', () => {
    const { service, loader } = create();
    service.acceptAll();
    TestBed.tick();
    expect(service.bannerOpen()).toBe(false);
    expect(service.analytics()).toBe(true);
    expect(loader.calls).toEqual(['grant']);
    const stored = JSON.parse(
      decodeURIComponent(document.cookie.match(/linker_consent=([^;]*)/)![1]),
    );
    expect(stored).toMatchObject({ v: 1, analytics: true });
  });

  it('rejecting all stores a no and loads nothing', () => {
    const { service, loader } = create();
    service.rejectAll();
    TestBed.tick();
    expect(service.bannerOpen()).toBe(false);
    expect(service.analytics()).toBe(false);
    expect(loader.calls).toEqual([]);
  });

  it('withdrawing consent revokes what was loaded', () => {
    const { service, loader } = create();
    service.acceptAll();
    TestBed.tick();
    service.openSettings();
    expect(service.bannerOpen()).toBe(true);
    service.save(false);
    TestBed.tick();
    expect(loader.calls).toEqual(['grant', 'revoke']);
    expect(service.bannerOpen()).toBe(false);
  });

  it('applies a stored yes on the next visit without asking', () => {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ v: 1, analytics: true, ts: 1 }))}; Path=/`;
    const { service, loader } = create();
    expect(service.bannerOpen()).toBe(false);
    expect(loader.calls).toEqual(['grant']);
  });

  it('asks again when the policy version changed', () => {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ v: 1, analytics: true, ts: 1 }))}; Path=/`;
    const { service, loader } = create(2);
    expect(service.bannerOpen()).toBe(true);
    expect(service.analytics()).toBe(false);
    expect(loader.calls).toEqual([]);
  });

  it('treats a malformed cookie as no choice', () => {
    document.cookie = `${CONSENT_COOKIE}=not-json; Path=/`;
    const { service } = create();
    expect(service.bannerOpen()).toBe(true);
  });

  it('honours Global Privacy Control: no banner, analytics off even after a stored yes', () => {
    setGpc(true);
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ v: 1, analytics: true, ts: 1 }))}; Path=/`;
    const { service, loader } = create();
    expect(service.gpc()).toBe(true);
    expect(service.analytics()).toBe(false);
    expect(loader.calls).toEqual([]);
    clearCookies();
    TestBed.resetTestingModule();
    const fresh = create();
    expect(fresh.service.bannerOpen()).toBe(false);
  });
});
