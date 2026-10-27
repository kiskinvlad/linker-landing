import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ACCOUNT_API } from '../api/account.api';
import { ApiError } from '../api/api-error';
import { BILLING_REDIRECT, BillingFacade } from './billing.facade';

function setup(checkout: () => unknown, locale = 'en-US') {
  const redirect = vi.fn();
  const api = {
    checkout: vi.fn(checkout),
    portal: vi.fn(() => of({ url: 'https://billing.stripe.test/p/1' })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: ACCOUNT_API, useValue: api },
      { provide: BILLING_REDIRECT, useValue: redirect },
      { provide: LOCALE_ID, useValue: locale },
    ],
  });
  return { facade: TestBed.inject(BillingFacade), api, redirect };
}

describe('BillingFacade', () => {
  it('sends the browser to Stripe Checkout in the portal’s language', async () => {
    const { facade, api, redirect } = setup(
      () => of({ url: 'https://checkout.stripe.test/c/1' }),
      'uk',
    );

    await facade.checkout('pro');

    expect(api.checkout).toHaveBeenCalledWith('pro', 'uk');
    expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.test/c/1');
  });

  it('opens billing instead when Stripe already bills the account', async () => {
    const { facade, api, redirect } = setup(() =>
      throwError(() => new ApiError(409, 'Already subscribed', [], null, 'ALREADY_SUBSCRIBED')),
    );

    await facade.checkout('business');

    expect(api.portal).toHaveBeenCalledWith('en');
    expect(redirect).toHaveBeenCalledWith('https://billing.stripe.test/p/1');
  });

  it('leaves any other refusal to the caller, going nowhere', async () => {
    const { facade, redirect } = setup(() =>
      throwError(() => new ApiError(403, 'Verify', [], null, 'EMAIL_NOT_VERIFIED')),
    );

    await expect(facade.checkout('pro')).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    expect(redirect).not.toHaveBeenCalled();
  });
});
