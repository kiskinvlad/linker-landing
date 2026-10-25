import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PRICING_FAQ } from '../../features/marketing/pricing/pricing.content';
import { PlanCards } from './plan-cards';

function render(): HTMLElement {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(PlanCards);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PlanCards: the AI assistant', () => {
  it('lists 1,000 AI credits a month on the paid plan', () => {
    const pro = render().querySelector('.plan--pro')!;
    expect(pro.textContent).toContain('AI assistant: 1,000 credits a month');
  });

  it('shows the AI assistant as not included on Free', () => {
    const free = render().querySelector('.plan--free')!;
    expect(free.textContent).toContain('AI assistant not included');
  });

  it('explains credits in the pricing FAQ', () => {
    const answer = PRICING_FAQ.find((item) => item.q === 'What are AI credits?')?.a;
    expect(answer).toContain('5 credits');
    expect(answer).toContain('1,000 a month');
    expect(answer).toContain('don’t roll over');
  });
});
