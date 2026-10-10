import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ApiError } from './api-error';
import { APP_IDENTITY } from '../config/app-identity';

/**
 * linker-backend `feedback.constants.ts` (plan §10a). The form offers exactly
 * these, so a value the API would reject can't be picked.
 */
export const FEEDBACK_KINDS = ['feature', 'improvement', 'bug'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_AREAS = [
  'editor',
  'widgets',
  'publishing',
  'forms',
  'analytics',
  'billing',
  'account',
  'other',
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export type FeedbackStatus =
  'submitted' | 'under_review' | 'approved' | 'shipped' | 'declined' | 'duplicate';

export const FEEDBACK_TITLE_MIN = 3;
export const FEEDBACK_TITLE_MAX = 120;
export const FEEDBACK_BODY_MIN = 10;
export const FEEDBACK_BODY_MAX = 5000;

/** The 429 `code` once a user has sent their ideas for the day (five per 24 hours). */
export const FEEDBACK_LIMIT = 'FEEDBACK_LIMIT';

/** `POST /feedback` body (`CreateFeedbackDto`). No screenshot: uploads are v2. */
export interface FeedbackRequest {
  kind: FeedbackKind;
  title: string;
  body: string;
  area: FeedbackArea;
  contactOk: boolean;
}

/** `FeedbackItemDto`: one of the signed-in user's own ideas. */
export interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  title: string;
  area: FeedbackArea;
  status: FeedbackStatus;
  /** Set once shipped: `unlock` ("free for you") or `thanks`. */
  reward: 'unlock' | 'thanks' | null;
  /** A duplicate sent after the original was approved: "already planned", no reward. */
  alreadyPlanned: boolean;
  featureKey: string | null;
  createdAt: string;
  approvedAt: string | null;
  shippedAt: string | null;
}

/** The backend's `/feedback` resource. Same shape as the other adapters. */
export interface FeedbackApi {
  /** 201. 403 unverified; 429 with `code: FEEDBACK_LIMIT` after five a day. */
  submit(body: FeedbackRequest): Observable<FeedbackItem>;
  /** Newest first. */
  mine(): Observable<FeedbackItem[]>;
}

@Injectable({ providedIn: 'root' })
export class HttpFeedbackApi implements FeedbackApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_IDENTITY).apiUrl;

  submit(body: FeedbackRequest): Observable<FeedbackItem> {
    return this.apiUrl
      ? this.http.post<FeedbackItem>(`${this.apiUrl}/feedback`, body)
      : this.noApi();
  }

  mine(): Observable<FeedbackItem[]> {
    return this.apiUrl
      ? this.http.get<FeedbackItem[]>(`${this.apiUrl}/feedback/mine`)
      : this.noApi();
  }

  private noApi(): Observable<never> {
    return throwError(() => new ApiError(0, 'API not configured'));
  }
}

export const FEEDBACK_API = new InjectionToken<FeedbackApi>('FEEDBACK_API', {
  providedIn: 'root',
  factory: () => inject(HttpFeedbackApi),
});
