import { Injectable, computed, signal } from '@angular/core';
import { User } from '../api/auth.api';

/**
 * Who is signed in, as far as the portal knows (plan §5).
 *
 * - `unknown`: not asked yet. The state of every prerendered page, since the
 *   session cookie is host-only on the API origin and invisible to the build.
 * - `anonymous` / `authenticated`: the answer from `GET /auth/me`.
 *
 * UI state only. The API is the real boundary: nothing here authorises anything.
 */
export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly _user = signal<User | null>(null);
  private readonly _status = signal<SessionStatus>('unknown');

  readonly user = this._user.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  setUser(user: User): void {
    this._user.set(user);
    this._status.set('authenticated');
  }

  clear(): void {
    this._user.set(null);
    this._status.set('anonymous');
  }
}
