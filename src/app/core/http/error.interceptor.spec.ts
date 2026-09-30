import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { User } from '../api/auth.api';
import { SessionStore } from '../auth/session.store';
import { APP_IDENTITY } from '../config/app-identity';
import { TEST_LEGAL_IDENTITY } from '../config/app-identity.testing';
import { errorInterceptor } from './error.interceptor';

const API = 'http://api.test/api/v1';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      {
        provide: APP_IDENTITY,
        useValue: {
          productName: 'Kitlet',
          siteUrl: 'https://x',
          apiUrl: API,
          editorPath: '/editor/',
          legal: TEST_LEGAL_IDENTITY,
        },
      },
    ],
  });
  const store = TestBed.inject(SessionStore);
  store.setUser({ id: '1', email: 'a@b.c' } as User);
  return {
    http: TestBed.inject(HttpClient),
    backend: TestBed.inject(HttpTestingController),
    store,
  };
}

/** Sends a request, answers it with a 401, and swallows the rejection. */
async function answer401(method: 'GET' | 'POST' | 'DELETE', path: string) {
  const { http, backend, store } = setup();
  const done = firstValueFrom(http.request(method, `${API}${path}`)).catch(() => undefined);
  backend
    .expectOne({ method, url: `${API}${path}` })
    .flush({ status: 401, detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  await done;
  return store;
}

describe('errorInterceptor', () => {
  it('signs the visitor out when an authenticated call answers 401', async () => {
    const store = await answer401('GET', '/billing/subscription');
    expect(store.status()).toBe('anonymous');
  });

  it.each([
    ['POST', '/auth/login'],
    ['POST', '/auth/password/change'],
    ['DELETE', '/users/me'],
  ] as const)('leaves a wrong password on %s %s to the form', async (method, path) => {
    const store = await answer401(method, path);
    expect(store.status()).toBe('authenticated');
  });
});
