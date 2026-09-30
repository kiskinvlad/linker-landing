import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
  withI18nSupport,
} from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { CONSENT_LOADERS } from './core/consent/consent.model';
import { Ga4Loader } from './core/consent/ga4.loader';
import { AuthFacade } from './core/auth/auth.facade';
import { credentialsInterceptor } from './core/http/credentials.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    // withI18nSupport is load-bearing: without it Angular marks every component with
    // an i18n block ngSkipHydration, throws the prerendered DOM away and re-renders
    // it — measured as a 0.82 CLS footer jump and a slower LCP.
    provideClientHydration(withEventReplay(), withI18nSupport()),
    // What each consent category switches on (plan §8). Portal only: GA never runs
    // inside /editor/ (D11).
    { provide: CONSENT_LOADERS, useFactory: () => [inject(Ga4Loader)] },
    provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor, errorInterceptor])),
    // Ask the API who is signed in (plan §5), without awaiting it: blocking bootstrap
    // on a round trip would delay hydration on every prerendered page. The header
    // updates when the answer lands, and guards await it themselves. Browser-only
    // inside refresh(): prerendering has no visitor to ask about.
    provideAppInitializer(() => {
      void inject(AuthFacade).refresh();
    }),
    // Router anchor scrolling is window.scrollTo(elementTop - offset), so it ignores
    // CSS scroll-padding/scroll-margin and would land every #anchor under the sticky
    // header. Match the `scroll-padding-top` on html in styles.css.
    provideAppInitializer(() => {
      inject(ViewportScroller).setOffset([0, 88]);
    }),
  ],
};
