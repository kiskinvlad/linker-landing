import { Directive, ElementRef, afterNextRender, inject, input, DestroyRef } from '@angular/core';

/**
 * Fades an element in the first time it scrolls into view (plan §6 "Animations").
 *
 * Runs only in the browser, after hydration, and only arms elements that are still
 * below the fold — so prerendered HTML is fully visible, no-JS visitors see
 * everything, and above-the-fold content never flickers.
 */
@Directive({
  selector: '[kitReveal]',
})
export class RevealDirective {
  /** Stagger in milliseconds, for siblings revealed together. */
  readonly kitReveal = input<number | ''>('');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion || !('IntersectionObserver' in window)) {
        return;
      }
      if (host.getBoundingClientRect().top < window.innerHeight) {
        return;
      }

      const delay = this.kitReveal();
      if (typeof delay === 'number' && delay > 0) {
        host.style.setProperty('--reveal-delay', `${delay}ms`);
      }
      host.classList.add('reveal-armed');

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            host.classList.add('is-visible');
            observer.disconnect();
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
