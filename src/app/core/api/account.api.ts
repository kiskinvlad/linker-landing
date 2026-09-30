import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ApiError } from './api-error';
import { User } from './auth.api';
import { APP_IDENTITY } from '../config/app-identity';

/** `PATCH /users/me` body: only the fields sent change; `null` clears company or phone. */
export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  company?: string | null;
  /** International format (`+380…`); the API stores it as E.164. */
  phone?: string | null;
  preferredLanguage?: string;
}

/** linker-backend `PlanLimitsDto`. */
export interface PlanLimits {
  maxWidgets: number;
  maxVersionsPerWidget: number;
  monthlyViews: number;
  features: string[];
}

export interface Plan {
  code: string;
  name: string;
  /** Per month, minor units. */
  priceCents: number;
  currency: string;
  limits: PlanLimits;
}

export interface Subscription {
  plan: Plan;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** What the account may do: the plan's limits today, plus unlocked features later (§10a). */
  entitlements: PlanLimits;
}

/**
 * The backend's `/users/me` and `/billing` resources: what the account area reads
 * and changes (plan §10). Same shape as `AuthApi`: behind a token, errors as
 * HttpErrorResponse for `ApiError.from`.
 */
export interface AccountApi {
  /** 200 with the updated user (without `legal`). 400 with field errors. */
  updateProfile(body: ProfileUpdate): Observable<User>;
  /** 204, every session ended. 401 on a wrong password. */
  deleteAccount(password: string): Observable<void>;
  /** 204; idempotent. 400 unless `version` is the current one. */
  acceptTerms(version: string): Observable<void>;
  plans(): Observable<Plan[]>;
  subscription(): Observable<Subscription>;
}

@Injectable({ providedIn: 'root' })
export class HttpAccountApi implements AccountApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_IDENTITY).apiUrl;

  updateProfile(body: ProfileUpdate): Observable<User> {
    return this.apiUrl ? this.http.patch<User>(`${this.apiUrl}/users/me`, body) : this.noApi();
  }

  deleteAccount(password: string): Observable<void> {
    return this.apiUrl
      ? this.http.delete<void>(`${this.apiUrl}/users/me`, { body: { password } })
      : this.noApi();
  }

  acceptTerms(version: string): Observable<void> {
    return this.apiUrl
      ? this.http.post<void>(`${this.apiUrl}/users/me/consents`, { document: 'terms', version })
      : this.noApi();
  }

  plans(): Observable<Plan[]> {
    return this.apiUrl ? this.http.get<Plan[]>(`${this.apiUrl}/billing/plans`) : this.noApi();
  }

  subscription(): Observable<Subscription> {
    return this.apiUrl
      ? this.http.get<Subscription>(`${this.apiUrl}/billing/subscription`)
      : this.noApi();
  }

  private noApi(): Observable<never> {
    return throwError(() => new ApiError(0, 'API not configured'));
  }
}

export const ACCOUNT_API = new InjectionToken<AccountApi>('ACCOUNT_API', {
  providedIn: 'root',
  factory: () => inject(HttpAccountApi),
});
