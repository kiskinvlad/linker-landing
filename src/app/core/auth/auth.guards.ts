import { DOCUMENT, Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { ANALYTICS_PATHS, APP_IDENTITY } from '../config/app-identity';
import { AuthFacade } from './auth.facade';
import { isAppUrl, safeReturnUrl } from './return-url';
import { SessionStore } from './session.store';
import { User } from '../api/auth.api';

/**
 * Pages for signed-in visitors only: anyone else goes to /login with a returnUrl
 * back here. Convenience, not security (plan §5): the API enforces the session.
 * Used by the account pages and /verify-email.
 */
export const authGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
  const auth = inject(AuthFacade);
  const store = inject(SessionStore);
  const router = inject(Router);
  await auth.ensureKnown();
  return store.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Pages for signed-out visitors (login, register, forgot password): a signed-in
 * visitor is sent on to where they were going, as if they had just signed in.
 */
export const guestGuard: CanActivateFn = async (route): Promise<boolean> => {
  const auth = inject(AuthFacade);
  const store = inject(SessionStore);
  const nav = inject(ReturnNavigator);
  await auth.ensureKnown();
  const user = store.user();
  if (!user) return true;
  await nav.afterSignIn(user, route.queryParamMap.get('returnUrl'));
  return false;
};

/** Sends the visitor to a validated returnUrl: the router for portal pages, a full load for the other apps. */
@Injectable({ providedIn: 'root' })
export class ReturnNavigator {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly identity = inject(APP_IDENTITY);
  // Analytics in any language: its pages send this one's own path as the returnUrl.
  private readonly appPaths = [this.identity.editorPath, ...ANALYTICS_PATHS];

  async go(returnUrl: string | null | undefined, fallback = '/'): Promise<void> {
    const url = safeReturnUrl(returnUrl, fallback);
    if (isAppUrl(url, this.appPaths)) {
      this.document.location.assign(url);
      return;
    }
    await this.router.navigateByUrl(url);
  }

  /**
   * After signing in or up. The editor and analytics need a verified address (plan
   * D9), so an unverified visitor headed there stops at /verify-email first, which
   * carries the returnUrl on. Everywhere else in the portal works unverified.
   */
  async afterSignIn(user: User, returnUrl: string | null | undefined): Promise<void> {
    const url = safeReturnUrl(returnUrl, '/');
    if (!user.emailVerified && isAppUrl(url, this.appPaths)) {
      await this.router.navigate(['/verify-email'], { queryParams: { returnUrl: url } });
      return;
    }
    await this.go(url);
  }
}
