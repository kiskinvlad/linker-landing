import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ACCOUNT_API, Plan, ProfileUpdate, Subscription } from '../api/account.api';
import { User } from '../api/auth.api';
import { AuthFacade } from './auth.facade';
import { SessionStore } from './session.store';

/**
 * What the account area calls (plan §10): profile, terms, plan, deletion. Keeps
 * `SessionStore` in step, so the header's name and initials change with the form.
 */
@Injectable({ providedIn: 'root' })
export class AccountFacade {
  private readonly api = inject(ACCOUNT_API);
  private readonly store = inject(SessionStore);
  private readonly auth = inject(AuthFacade);

  async updateProfile(body: ProfileUpdate): Promise<User> {
    const user = await firstValueFrom(this.api.updateProfile(body));
    this.store.updateUser(user);
    return user;
  }

  /** Signed out locally only once the API confirms: a wrong password changes nothing. */
  async deleteAccount(password: string): Promise<void> {
    await firstValueFrom(this.api.deleteAccount(password));
    this.store.clear();
  }

  /** Then asks for the session again, so `legal` reflects the acceptance. */
  async acceptTerms(version: string): Promise<void> {
    await firstValueFrom(this.api.acceptTerms(version));
    await this.auth.refresh();
  }

  plans(): Promise<Plan[]> {
    return firstValueFrom(this.api.plans());
  }

  subscription(): Promise<Subscription> {
    return firstValueFrom(this.api.subscription());
  }
}
