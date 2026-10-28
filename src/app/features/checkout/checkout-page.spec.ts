import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ACCOUNT_API, BillingClientConfig } from '../../core/api/account.api';
import { PADDLE_LOADER, PaddleJs } from '../../core/billing/paddle-loader';
import { CheckoutPage } from './checkout-page';

const PADDLE_CONFIG: BillingClientConfig = {
  provider: 'paddle',
  paddle: { clientToken: 'test_token', environment: 'sandbox' },
};

async function render(
  options: {
    txn?: string | null;
    config?: BillingClientConfig;
    loader?: () => Promise<PaddleJs>;
  } = {},
) {
  let callback: ((event: { name?: string }) => void) | undefined;
  const paddle = {
    Environment: { set: vi.fn() },
    Initialize: vi.fn((opts: { eventCallback?: (event: { name?: string }) => void }) => {
      callback = opts.eventCallback;
    }),
  };
  const loader = vi.fn(options.loader ?? (() => Promise.resolve(paddle as PaddleJs)));
  const txn = options.txn === undefined ? 'txn_01' : options.txn;
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ACCOUNT_API,
        useValue: { billingConfig: () => of(options.config ?? PADDLE_CONFIG) },
      },
      { provide: PADDLE_LOADER, useValue: loader },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(txn ? { _ptxn: txn } : {}) } },
      },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CheckoutPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  return {
    el: fixture.nativeElement as HTMLElement,
    paddle,
    loader,
    navigate,
    fire: (name: string) => callback?.({ name }),
  };
}

describe('CheckoutPage', () => {
  it('loads Paddle.js and initializes it with the client token and environment', async () => {
    const { el, paddle } = await render();

    expect(paddle.Environment.set).toHaveBeenCalledWith('sandbox');
    expect(paddle.Initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'test_token',
        checkout: { settings: { displayMode: 'overlay', locale: 'en' } },
      }),
    );
    expect(el.textContent).toContain('Complete your payment');
  });

  it('goes to the account page to confirm once paid, and back to pricing when closed', async () => {
    const { fire, navigate } = await render();

    fire('checkout.completed');
    expect(navigate).toHaveBeenCalledWith(['/account'], { queryParams: { checkout: 'done' } });

    fire('checkout.closed');
    expect(navigate).toHaveBeenCalledWith(['/pricing']);
  });

  it('loads nothing without a transaction in the URL', async () => {
    const { el, loader } = await render({ txn: null });

    expect(loader).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('loads nothing when the server does not sell through Paddle', async () => {
    const { loader } = await render({ config: { provider: 'internal', paddle: null } });

    expect(loader).not.toHaveBeenCalled();
  });

  it('says so, with a way back, when Paddle.js cannot load', async () => {
    const { el } = await render({ loader: () => Promise.reject(new Error('blocked')) });

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('didn’t load');
    expect(el.querySelector('a[href="/pricing"]')).not.toBeNull();
  });
});
