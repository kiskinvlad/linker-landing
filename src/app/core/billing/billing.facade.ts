import { DOCUMENT, Injectable, InjectionToken, LOCALE_ID, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ACCOUNT_API, BillingLocale } from '../api/account.api';
import { ApiError } from '../api/api-error';

/**
 * Leaves the portal for a page on the payment provider. A token so specs can
 * see where the browser would have gone.
 */
export const BILLING_REDIRECT = new InjectionToken<(url: string) => void>('BILLING_REDIRECT', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return (url: string) => document.location.assign(url);
  },
});

/**
 * Buying and managing a paid plan (stripe-payments D11). Both go to hosted
 * Stripe pages: the portal never shows a card form or loads Stripe's script.
 * The plan itself changes when Stripe confirms the payment to the API, so the
 * account page polls on the way back (`?checkout=done`).
 */
@Injectable({ providedIn: 'root' })
export class BillingFacade {
  private readonly api = inject(ACCOUNT_API);
  private readonly redirect = inject(BILLING_REDIRECT);
  private readonly locale: BillingLocale = inject(LOCALE_ID).startsWith('uk') ? 'uk' : 'en';

  /**
   * Sends the browser to Stripe Checkout for `planCode`. An account Stripe
   * already bills goes to self-service billing instead, where plans change.
   * Other refusals reject with the `ApiError` for the caller to explain.
   */
  async checkout(planCode: string): Promise<void> {
    try {
      const { url } = await firstValueFrom(this.api.checkout(planCode, this.locale));
      this.redirect(url);
    } catch (error) {
      if (ApiError.from(error).code === 'ALREADY_SUBSCRIBED') {
        await this.manage();
        return;
      }
      throw error;
    }
  }

  /** Sends the browser to the Stripe Customer Portal. */
  async manage(): Promise<void> {
    const { url } = await firstValueFrom(this.api.portal(this.locale));
    this.redirect(url);
  }
}
