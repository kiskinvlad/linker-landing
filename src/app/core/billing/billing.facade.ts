import { DOCUMENT, Injectable, InjectionToken, LOCALE_ID, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ACCOUNT_API, BillingInterval, BillingLocale } from '../api/account.api';

/**
 * Leaves the portal for the checkout or the provider's billing page. A token
 * so specs can see where the browser would have gone.
 */
export const BILLING_REDIRECT = new InjectionToken<(url: string) => void>('BILLING_REDIRECT', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return (url: string) => document.location.assign(url);
  },
});

/**
 * Buying, changing and cancelling a paid plan (stripe-payments D8, D11).
 * Checkout opens on the portal's own `/checkout` page, the only page that
 * loads the provider's script; the plan itself changes when the provider
 * confirms to the API, so the account page polls on the way back
 * (`?checkout=done`). Refusals reject with the `ApiError` for the caller to
 * explain; `ALREADY_SUBSCRIBED` means "offer Change plan instead".
 */
@Injectable({ providedIn: 'root' })
export class BillingFacade {
  private readonly api = inject(ACCOUNT_API);
  private readonly redirect = inject(BILLING_REDIRECT);
  private readonly locale: BillingLocale = inject(LOCALE_ID).startsWith('uk') ? 'uk' : 'en';

  /** Sends the browser to checkout for `planCode`, billed every `interval`. */
  async checkout(planCode: string, interval: BillingInterval = 'month'): Promise<void> {
    const { url } = await firstValueFrom(this.api.checkout(planCode, interval, this.locale));
    this.redirect(url);
  }

  /** Moves the paid subscription to another plan or interval, prorated by the provider. */
  changePlan(planCode: string, interval: BillingInterval): Promise<void> {
    return firstValueFrom(this.api.changePlan(planCode, interval), { defaultValue: undefined });
  }

  /** Ends the plan at the end of the paid period. */
  cancel(): Promise<void> {
    return firstValueFrom(this.api.cancel(), { defaultValue: undefined });
  }

  /** Keeps the plan: undoes a scheduled cancellation. */
  resume(): Promise<void> {
    return firstValueFrom(this.api.resume(), { defaultValue: undefined });
  }

  /** Sends the browser to the provider's customer portal (card, invoices). */
  async manage(): Promise<void> {
    const { url } = await firstValueFrom(this.api.portal(this.locale));
    this.redirect(url);
  }
}
