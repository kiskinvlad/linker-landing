import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../api/api-error';
import { AUTH_API, AuthApi, User } from '../api/auth.api';
import { APP_IDENTITY } from '../config/app-identity';
import { TEST_LEGAL_IDENTITY } from '../config/app-identity.testing';
import { AuthFacade } from './auth.facade';
import { authGuard, guestGuard } from './auth.guards';
import { SessionStore } from './session.store';

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

const UNVERIFIED: User = { ...ADA, emailVerified: false };

function fakeApi(me: () => Observable<User>): AuthApi & { meCalls: number } {
  const api = {
    meCalls: 0,
    me: () => {
      api.meCalls++;
      return me();
    },
    login: () => of(ADA),
    register: () => of(ADA),
    logout: () => of(undefined),
    forgotPassword: () => of(undefined),
    resetPassword: () => of(undefined),
    verifyEmail: () => of(undefined),
    resendVerification: () => of(undefined),
    changePassword: () => of(undefined),
    logoutAll: () => of(undefined),
  };
  return api;
}

function setup(me: () => Observable<User>, apiUrl: string | null = 'http://api.test/api/v1') {
  const api = fakeApi(me);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AUTH_API, useValue: api },
      {
        provide: APP_IDENTITY,
        useValue: {
          productName: 'Kitlet',
          siteUrl: 'https://x',
          apiUrl,
          editorPath: '/editor/',
          legal: TEST_LEGAL_IDENTITY,
        },
      },
    ],
  });
  return { api, auth: TestBed.inject(AuthFacade), store: TestBed.inject(SessionStore) };
}

const runGuard = (guard: typeof authGuard, url = '/account', query: Record<string, string> = {}) =>
  TestBed.runInInjectionContext(() =>
    guard(
      {
        queryParamMap: new Map(
          Object.entries(query),
        ) as unknown as ActivatedRouteSnapshot['queryParamMap'],
      } as ActivatedRouteSnapshot,
      { url } as RouterStateSnapshot,
    ),
  );

describe('AuthFacade', () => {
  it('marks the visitor signed in when /auth/me answers', async () => {
    const { auth, store } = setup(() => of(ADA));
    await auth.refresh();
    expect(store.status()).toBe('authenticated');
    expect(store.user()?.email).toBe('ada@example.com');
  });

  it('marks the visitor anonymous on 401', async () => {
    const { auth, store } = setup(() => throwError(() => new ApiError(401, 'Unauthorized')));
    await auth.refresh();
    expect(store.status()).toBe('anonymous');
  });

  it('does not leave the site stuck on "unknown" when the API is unreachable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { auth, store } = setup(() => throwError(() => new ApiError(0, 'offline')));
    await auth.refresh();
    expect(store.status()).toBe('anonymous');
    warn.mockRestore();
  });

  it('asks nothing when no API is configured (production before M8)', async () => {
    const { api, auth, store } = setup(() => of(ADA), null);
    await auth.refresh();
    expect(api.meCalls).toBe(0);
    expect(store.status()).toBe('anonymous');
  });

  it('shares one /auth/me call between concurrent callers', async () => {
    const { api, auth } = setup(() => of(ADA));
    await Promise.all([auth.refresh(), auth.ensureKnown(), auth.ensureKnown()]);
    expect(api.meCalls).toBe(1);
  });

  it('signs out locally even if the logout call fails', async () => {
    const { api, auth, store } = setup(() => of(ADA));
    await auth.refresh();
    api.logout = () => throwError(() => new ApiError(0, 'offline'));
    await expect(auth.logout()).rejects.toBeInstanceOf(ApiError);
    expect(store.status()).toBe('anonymous');
  });
});

describe('authGuard', () => {
  it('sends a signed-out visitor to /login with a returnUrl', async () => {
    setup(() => throwError(() => new ApiError(401, 'Unauthorized')));
    const result = (await runGuard(authGuard, '/account/profile')) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/login?returnUrl=%2Faccount%2Fprofile',
    );
  });

  it('lets a signed-in visitor through', async () => {
    setup(() => of(ADA));
    expect(await runGuard(authGuard)).toBe(true);
  });
});

describe('guestGuard', () => {
  it('lets a signed-out visitor see the login page', async () => {
    setup(() => throwError(() => new ApiError(401, 'Unauthorized')));
    expect(await runGuard(guestGuard, '/login')).toBe(true);
  });

  it('sends a signed-in visitor on to a safe returnUrl instead', async () => {
    setup(() => of(ADA));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    expect(await runGuard(guestGuard, '/login', { returnUrl: '/pricing' })).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/pricing');
  });

  it('refuses an off-site returnUrl and goes home', async () => {
    setup(() => of(ADA));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await runGuard(guestGuard, '/login', { returnUrl: '//evil.example' });
    expect(navigate).toHaveBeenCalledWith('/');
  });
});

describe('verification routing', () => {
  it('stops an unverified visitor headed for the editor at /verify-email', async () => {
    setup(() => of(UNVERIFIED));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(await runGuard(guestGuard, '/login', { returnUrl: '/editor/' })).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/verify-email'], {
      queryParams: { returnUrl: '/editor/' },
    });
  });

  it('lets an unverified visitor go anywhere else in the portal', async () => {
    setup(() => of(UNVERIFIED));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await runGuard(guestGuard, '/login', { returnUrl: '/account' });
    expect(navigate).toHaveBeenCalledWith('/account');
  });

  it('re-asks the session after verifying, since the link may be another account’s', async () => {
    const { api, auth } = setup(() => of(UNVERIFIED));
    await auth.refresh();
    const before = api.meCalls;
    await auth.verifyEmail('t');
    expect(api.meCalls).toBe(before + 1);
  });

  it('does not ask for a session after verifying when nobody is signed in', async () => {
    const { api, auth } = setup(() => throwError(() => new ApiError(401, 'Unauthorized')));
    await auth.refresh();
    const before = api.meCalls;
    await auth.verifyEmail('t');
    expect(api.meCalls).toBe(before);
  });

  it('signs out locally after "log out of all devices", even if the call fails', async () => {
    const { api, auth, store } = setup(() => of(ADA));
    await auth.refresh();
    api.logoutAll = () => throwError(() => new ApiError(0, 'offline'));
    await expect(auth.logoutAll()).rejects.toBeInstanceOf(ApiError);
    expect(store.status()).toBe('anonymous');
  });
});

describe('SessionStore.updateUser', () => {
  it('keeps the terms status the profile routes do not send', () => {
    const store = new SessionStore();
    const legal = {
      termsVersionCurrent: 'v2',
      termsVersionAccepted: 'v2',
      termsAcceptedAt: '2026-10-01T00:00:00.000Z',
      requiresTermsAcceptance: false,
    };
    store.setUser({ ...ADA, legal });
    store.updateUser({ ...ADA, firstName: 'Augusta' });
    expect(store.user()?.firstName).toBe('Augusta');
    expect(store.user()?.legal).toEqual(legal);
  });
});
