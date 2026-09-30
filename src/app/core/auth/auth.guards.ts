import { DOCUMENT, Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { APP_IDENTITY } from '../config/app-identity';
import { AuthFacade } from './auth.facade';
import { isEditorUrl, safeReturnUrl } from './return-url';
import { SessionStore } from './session.store';

/**
 * Pages for signed-in visitors only: anyone else goes to /login with a returnUrl
 * back here. Convenience, not security (plan §5): the API enforces the session.
 * Used by the account pages (M5).
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
  if (!store.isAuthenticated()) return true;
  await nav.go(route.queryParamMap.get('returnUrl'));
  return false;
};

/** Sends the visitor to a validated returnUrl: the router for portal pages, a full load for the editor. */
@Injectable({ providedIn: 'root' })
export class ReturnNavigator {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly editorPath = inject(APP_IDENTITY).editorPath;

  async go(returnUrl: string | null | undefined, fallback = '/'): Promise<void> {
    const url = safeReturnUrl(returnUrl, fallback);
    if (isEditorUrl(url, this.editorPath)) {
      this.document.location.assign(url);
      return;
    }
    await this.router.navigateByUrl(url);
  }
}
