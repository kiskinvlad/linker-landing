import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ACCOUNT_API } from '../api/account.api';
import { ApiError } from '../api/api-error';
import { BILLING_REDIRECT, BillingFacade } from './billing.facade';

function setup(
  checkout: () => unknown = () => of({ url: '/checkout?_ptxn=txn_1' }),
  locale = 'en-US',
) {
  const redirect = vi.fn();
  const api = {
    checkout: vi.fn(checkout),
    changePlan: vi.fn(() => of(undefined)),
    cancel: vi.fn(() => of(undefined)),
    resume: vi.fn(() => of(undefined)),
    portal: vi.fn(() => of({ url: 'https://customer-portal.paddle.test/cpl_1' })),
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
  it('sends the browser to checkout at the chosen interval, in the portal’s language', async () => {
    const { facade, api, redirect } = setup(undefined, 'uk');

    await facade.checkout('growth', 'year');

    expect(api.checkout).toHaveBeenCalledWith('growth', 'year', 'uk');
    expect(redirect).toHaveBeenCalledWith('/checkout?_ptxn=txn_1');
  });

  it('bills monthly unless told otherwise', async () => {
    const { facade, api } = setup();

    await facade.checkout('pro');

    expect(api.checkout).toHaveBeenCalledWith('pro', 'month', 'en');
  });

  it('leaves a refusal to the caller, going nowhere', async () => {
    const { facade, redirect } = setup(() =>
      throwError(() => new ApiError(409, 'x', [], null, 'ALREADY_SUBSCRIBED')),
    );

    await expect(facade.checkout('pro')).rejects.toMatchObject({ code: 'ALREADY_SUBSCRIBED' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('changes plan, cancels and resumes through the API', async () => {
    const { facade, api } = setup();

    await facade.changePlan('business', 'month');
    await facade.cancel();
    await facade.resume();

    expect(api.changePlan).toHaveBeenCalledWith('business', 'month');
    expect(api.cancel).toHaveBeenCalled();
    expect(api.resume).toHaveBeenCalled();
  });

  it('opens the provider’s portal', async () => {
    const { facade, redirect } = setup();

    await facade.manage();

    expect(redirect).toHaveBeenCalledWith('https://customer-portal.paddle.test/cpl_1');
  });
});
