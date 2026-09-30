import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_IDENTITY } from '../config/app-identity';

/**
 * Sends the session cookie to the API and to nothing else (plan §5). The cookie is
 * host-only on the API origin; `withCredentials` on any other request would hand
 * cookies to a third party if one were ever called.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(APP_IDENTITY).apiUrl;
  return apiUrl && req.url.startsWith(`${apiUrl}/`)
    ? next(req.clone({ withCredentials: true }))
    : next(req);
};
