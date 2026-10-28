import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  NgZone,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ACCOUNT_API } from '../../core/api/account.api';
import { PADDLE_LOADER } from '../../core/billing/paddle-loader';

type CheckoutState = 'opening' | 'open' | 'failed';

/**
 * Where Paddle's checkout opens (stripe-payments D1): the API creates the
 * transaction and sends the browser here with `?_ptxn=txn_…`. This is the
 * only page that loads Paddle.js; Paddle opens the transaction in the URL
 * itself once initialized. Paid: on to `/account?checkout=done`, where the
 * plan is confirmed from the API. Closed: back to `/pricing`.
 */
@Component({
  selector: 'kit-checkout-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="checkout container" aria-labelledby="checkout-title">
      <h1 id="checkout-title" i18n="@@checkout.title">Checkout</h1>
      @switch (state()) {
        @case ('opening') {
          <p class="checkout__lead" aria-busy="true" i18n="@@checkout.opening">
            Opening secure checkout…
          </p>
        }
        @case ('open') {
          <p class="checkout__lead" i18n="@@checkout.open">
            Complete your payment in the secure checkout window. It is run by Paddle, who sells our
            plans on our behalf.
          </p>
        }
        @case ('failed') {
          <p class="notice notice--error" role="alert" i18n="@@checkout.failed">
            The payment form didn’t load. Check your connection or any content blocker, then try
            again.
          </p>
          <a class="btn btn--primary" routerLink="/pricing" i18n="@@checkout.back"
            >Back to pricing</a
          >
        }
      }
    </section>
  `,
  styles: `
    .checkout {
      max-inline-size: 560px;
      padding-block: 96px;
      text-align: center;
    }
    .checkout__lead {
      margin-block: 16px 24px;
      color: var(--ink-2);
    }
  `,
})
export class CheckoutPage {
  private readonly api = inject(ACCOUNT_API);
  private readonly loadPaddle = inject(PADDLE_LOADER);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly locale = inject(LOCALE_ID);

  protected readonly state = signal<CheckoutState>('opening');

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) void this.open();
  }

  private async open(): Promise<void> {
    const transaction = this.route.snapshot.queryParamMap.get('_ptxn');
    try {
      const config = await firstValueFrom(this.api.billingConfig());
      if (!transaction || !config.paddle) throw new Error('Nothing to pay for here');
      const paddle = await this.loadPaddle();
      paddle.Environment.set(config.paddle.environment);
      paddle.Initialize({
        token: config.paddle.clientToken,
        checkout: {
          settings: {
            displayMode: 'overlay',
            locale: this.locale.startsWith('uk') ? 'uk' : 'en',
          },
        },
        // Paddle calls back outside Angular: step back in to navigate.
        eventCallback: (event) =>
          this.zone.run(() => {
            if (event.name === 'checkout.completed') {
              void this.router.navigate(['/account'], { queryParams: { checkout: 'done' } });
            } else if (event.name === 'checkout.closed') {
              void this.router.navigate(['/pricing']);
            }
          }),
      });
      this.state.set('open');
    } catch {
      this.state.set('failed');
    }
  }
}
