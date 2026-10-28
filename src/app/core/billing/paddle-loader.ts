import { DOCUMENT, InjectionToken, inject } from '@angular/core';

/** Paddle.js v2's script, from Paddle's CDN (Paddle publishes no versioned URL). */
export const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

/** The part of Paddle.js the checkout page uses. */
export interface PaddleJs {
  Environment: { set(environment: 'sandbox' | 'production'): void };
  Initialize(options: {
    token: string;
    checkout?: { settings?: { displayMode?: 'overlay'; locale?: string } };
    eventCallback?: (event: { name?: string }) => void;
  }): void;
}

/**
 * Loads Paddle.js on demand and resolves with it (stripe-payments D1). Only
 * the `/checkout` page calls this, so no other page ever requests Paddle's
 * script. A token so specs can hand the page a stub instead.
 */
export const PADDLE_LOADER = new InjectionToken<() => Promise<PaddleJs>>('PADDLE_LOADER', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    let loading: Promise<PaddleJs> | null = null;
    return () =>
      (loading ??= new Promise<PaddleJs>((resolve, reject) => {
        const window = document.defaultView as (Window & { Paddle?: PaddleJs }) | null;
        if (window?.Paddle) {
          resolve(window.Paddle);
          return;
        }
        const script = document.createElement('script');
        script.src = PADDLE_JS_URL;
        script.async = true;
        script.onload = () =>
          window?.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle.js did not load'));
        script.onerror = () => {
          loading = null;
          reject(new Error('Paddle.js could not be fetched'));
        };
        document.head.appendChild(script);
      }));
  },
});
