import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ApiError } from './api-error';
import { APP_IDENTITY } from '../config/app-identity';

/** `UserResponseDto` from linker-backend (`src/modules/users/dto/user-response.dto.ts`). */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  preferredLanguage: string;
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * The backend's `/auth` resource (plan §5: one adapter per resource, behind a
 * token so tests swap in a fake). Errors surface as HttpErrorResponse; callers go
 * through `ApiError.from`.
 */
export interface AuthApi {
  /** 201 + session cookie; 409 when the email is taken. */
  register(body: RegisterRequest): Observable<User>;
  /** 200 + session cookie; 401 for wrong email OR password, deliberately alike. */
  login(body: LoginRequest): Observable<User>;
  /** 204, cookie cleared. */
  logout(): Observable<void>;
  /** 200 with the session's user; 401 when there is no valid session. */
  me(): Observable<User>;
  /** Always 202, whether or not the address has an account. */
  forgotPassword(email: string): Observable<void>;
  /** 204. Does NOT sign in. One generic 400 for unknown/used/expired tokens. */
  resetPassword(token: string, password: string): Observable<void>;
}

@Injectable({ providedIn: 'root' })
export class HttpAuthApi implements AuthApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_IDENTITY).apiUrl;

  register(body: RegisterRequest): Observable<User> {
    return this.post<User>('/register', body);
  }

  login(body: LoginRequest): Observable<User> {
    return this.post<User>('/login', body);
  }

  logout(): Observable<void> {
    return this.post<void>('/logout', null);
  }

  me(): Observable<User> {
    return this.apiUrl ? this.http.get<User>(`${this.apiUrl}/auth/me`) : this.noApi();
  }

  forgotPassword(email: string): Observable<void> {
    return this.post<void>('/password/forgot', { email });
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.post<void>('/password/reset', { token, password });
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.apiUrl ? this.http.post<T>(`${this.apiUrl}/auth${path}`, body) : this.noApi();
  }

  /** No API configured (production before M8): fail like an unreachable server. */
  private noApi(): Observable<never> {
    return throwError(() => new ApiError(0, 'API not configured'));
  }
}

export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API', {
  providedIn: 'root',
  factory: () => inject(HttpAuthApi),
});
