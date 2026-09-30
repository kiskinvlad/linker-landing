import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withI18nSupport,
} from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

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
  ],
};
