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
  /** AI assistant credits a month; absent from an API before the assistant. */
  aiCreditsPerMonth?: number;
  features: string[];
}

/** linker-backend `AiUsageDto`: this month's AI credits. `limit` is 0 without the assistant. */
export interface AiUsage {
  used: number;
  limit: number;
  /** Start of the next UTC month. */
  resetsAt: string;
  costs: { create: number; regenerate: number };
}

export interface Plan {
  code: string;
  name: string;
  /** Per month, minor units. */
  priceCents: number;
  currency: string;
  limits: PlanLimits;
  /**
   * True when this server takes payment for the plan (`POST /billing/checkout`).
   * Absent from an API before payments, which reads as not for sale.
   */
  purchasable?: boolean;
}

/** Who bills a subscription: `internal` for Free and plans set by an operator. */
export type BillingProvider = 'internal' | 'stripe';

/** `POST /billing/checkout` and `/billing/portal`: a page on the payment provider. */
export interface BillingRedirect {
  url: string;
}

/** The portal language the provider returns to. */
export type BillingLocale = 'en' | 'uk';

export interface Subscription {
  plan: Plan;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** What the account may do: the plan's quotas, and its features plus personal grants (§10a). */
  entitlements: PlanLimits;
  /**
   * Features on for this account only, not through its plan: today, ideas that
   * shipped as paid-plan features. Quotas are never granted. Optional only so an
   * API from before the Feedback Program still renders.
   */
  grantedFeatures?: string[];
  /** Optional only so an API from before payments still renders. */
  provider?: BillingProvider;
  /** The account can open self-service billing (`POST /billing/portal`). */
  manageable?: boolean;
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
  aiUsage(): Observable<AiUsage>;
  /**
   * 200 with a Stripe Checkout URL. 400 `PLAN_NOT_PURCHASABLE`; 403
   * `EMAIL_NOT_VERIFIED` / `TERMS_NOT_ACCEPTED` / `ACCOUNT_RESTRICTED`; 409
   * `ALREADY_SUBSCRIBED`.
   */
  checkout(planCode: string, locale: BillingLocale): Observable<BillingRedirect>;
  /** 200 with the Stripe Customer Portal URL. 409 `NO_BILLING_ACCOUNT`. */
  portal(locale: BillingLocale): Observable<BillingRedirect>;
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

  aiUsage(): Observable<AiUsage> {
    return this.apiUrl ? this.http.get<AiUsage>(`${this.apiUrl}/ai/usage`) : this.noApi();
  }

  checkout(planCode: string, locale: BillingLocale): Observable<BillingRedirect> {
    return this.apiUrl
      ? this.http.post<BillingRedirect>(`${this.apiUrl}/billing/checkout`, { planCode, locale })
      : this.noApi();
  }

  portal(locale: BillingLocale): Observable<BillingRedirect> {
    return this.apiUrl
      ? this.http.post<BillingRedirect>(`${this.apiUrl}/billing/portal`, { locale })
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
