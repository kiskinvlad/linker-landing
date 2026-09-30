import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { APP_IDENTITY } from '../config/app-identity';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../api/api-error';
import { AUTH_API, LoginRequest, RegisterRequest, User } from '../api/auth.api';
import { SessionStore } from './session.store';

/**
 * What components call to sign in, sign up and out (plan §5, facade over AuthApi +
 * SessionStore). Methods resolve with the user or reject with an `ApiError`.
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly api = inject(AUTH_API);
  private readonly store = inject(SessionStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly hasApi = inject(APP_IDENTITY).apiUrl !== null;
  private refreshing: Promise<void> | null = null;

  /**
   * Asks the API who is signed in. Browser-only: during prerender there is no
   * visitor, and the status stays `unknown`. Concurrent callers share one request.
   */
  refresh(): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();
    if (!this.hasApi) {
      this.store.clear();
      return Promise.resolve();
    }
    this.refreshing ??= firstValueFrom(this.api.me())
      .then((user) => this.store.setUser(user))
      .catch((error: unknown) => {
        // 401 is the ordinary anonymous answer. Anything else (API down, offline)
        // also leaves the visitor anonymous rather than stuck on `unknown`, so
        // guards resolve and the public site keeps working without the API.
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.warn('Could not check the session', error);
        }
        this.store.clear();
      })
      .finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /** Resolves once the status is known, asking the API if nobody has yet. */
  async ensureKnown(): Promise<void> {
    if (this.store.status() === 'unknown') await this.refresh();
  }

  async login(body: LoginRequest): Promise<User> {
    const user = await firstValueFrom(this.api.login(body));
    this.store.setUser(user);
    return user;
  }

  async register(body: RegisterRequest): Promise<User> {
    const user = await firstValueFrom(this.api.register(body));
    this.store.setUser(user);
    return user;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } finally {
      // Signed out locally even if the call failed: the UI must not keep showing
      // an account the visitor asked to leave. A 401 here means already gone.
      this.store.clear();
    }
  }

  forgotPassword(email: string): Promise<void> {
    return firstValueFrom(this.api.forgotPassword(email));
  }

  resetPassword(token: string, password: string): Promise<void> {
    return firstValueFrom(this.api.resetPassword(token, password));
  }

  /**
   * Redeems a verification link. The link may belong to another account than the
   * one signed in on this browser, so the session is asked again rather than
   * assumed verified.
   */
  async verifyEmail(token: string): Promise<void> {
    await firstValueFrom(this.api.verifyEmail(token));
    if (this.store.isAuthenticated()) await this.refresh();
  }

  resendVerification(): Promise<void> {
    return firstValueFrom(this.api.resendVerification());
  }

  /** This browser stays signed in (the API issues a new cookie); every other session ends. */
  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return firstValueFrom(this.api.changePassword(currentPassword, newPassword));
  }

  async logoutAll(): Promise<void> {
    try {
      await firstValueFrom(this.api.logoutAll());
    } finally {
      this.store.clear();
    }
  }
}
