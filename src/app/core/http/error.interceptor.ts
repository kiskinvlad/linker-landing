import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../api/api-error';
import { SessionStore } from '../auth/session.store';
import { APP_IDENTITY } from '../config/app-identity';

/**
 * Turns every API failure into an `ApiError` (plan §5), so components never parse
 * HttpErrorResponse or ProblemDetails themselves.
 *
 * A 401 from an authenticated call means the session is gone (expired, revoked by
 * "log out everywhere" or a password change), so the store is cleared and guarded
 * pages bounce on their next check. Login's own 401 is a wrong password, not a
 * lost session, so it is left to the form.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(APP_IDENTITY).apiUrl;
  const session = inject(SessionStore);
  return next(req).pipe(
    catchError((error: unknown) => {
      const apiError = ApiError.from(error);
      if (
        apiError.status === 401 &&
        !!apiUrl &&
        req.url.startsWith(`${apiUrl}/`) &&
        !req.url.endsWith('/auth/login')
      ) {
        session.clear();
      }
      return throwError(() => apiError);
    }),
  );
};
