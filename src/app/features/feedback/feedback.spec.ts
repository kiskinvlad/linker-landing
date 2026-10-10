import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { User } from '../../core/api/auth.api';
import {
  FEEDBACK_API,
  FeedbackApi,
  FeedbackItem,
  FeedbackRequest,
} from '../../core/api/feedback.api';
import { SessionStore } from '../../core/auth/session.store';
import { ANALYTICS_CONFIG } from '../../core/consent/ga4.loader';
import { FeedbackPage } from './feedback-page';
import { statusView } from './feedback.content';

const USER: User = {
  id: 'u1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  company: null,
  phone: null,
  preferredLanguage: 'en',
  emailVerified: true,
  createdAt: '2026-10-01T00:00:00.000Z',
};

const item = (over: Partial<FeedbackItem> = {}): FeedbackItem => ({
  id: 'f1',
  kind: 'feature',
  title: 'Countdown timer',
  area: 'widgets',
  status: 'submitted',
  reward: null,
  alreadyPlanned: false,
  featureKey: null,
  createdAt: '2026-10-02T10:00:00.000Z',
  approvedAt: null,
  shippedAt: null,
  ...over,
});

class FakeFeedbackApi implements FeedbackApi {
  sent: FeedbackRequest[] = [];
  mineResult: () => Observable<FeedbackItem[]> = () => of([]);
  submitResult: (body: FeedbackRequest) => Observable<FeedbackItem> = (body) =>
    of(item({ id: 'new', kind: body.kind, title: body.title, area: body.area }));

  submit(body: FeedbackRequest): Observable<FeedbackItem> {
    this.sent.push(body);
    return this.submitResult(body);
  }

  mine(): Observable<FeedbackItem[]> {
    return this.mineResult();
  }
}

async function render(session: 'unknown' | 'anonymous' | User, api = new FakeFeedbackApi()) {
  TestBed.configureTestingModule({
    imports: [FeedbackPage],
    providers: [
      provideRouter([]),
      { provide: FEEDBACK_API, useValue: api },
      { provide: ANALYTICS_CONFIG, useValue: { ga4MeasurementId: null } },
    ],
  });
  const store = TestBed.inject(SessionStore);
  if (session === 'anonymous') store.clear();
  else if (session !== 'unknown') store.setUser(session);
  const fixture = TestBed.createComponent(FeedbackPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, api };
}

function fill(el: HTMLElement, title: string, body: string): void {
  const t = el.querySelector<HTMLInputElement>('#feedback-title')!;
  t.value = title;
  t.dispatchEvent(new Event('input'));
  const b = el.querySelector<HTMLTextAreaElement>('#feedback-body')!;
  b.value = body;
  b.dispatchEvent(new Event('input'));
}

describe('FeedbackPage', () => {
  it('shows the rules to everyone, and only a placeholder until the session is known', async () => {
    const { el } = await render('unknown');
    expect(el.querySelector('h1')?.textContent).toContain('Suggest an idea');
    expect(el.querySelector('.feedback__rules')?.textContent).toContain('never');
    expect(el.querySelector('a[href="/legal/feedback-program"]')).not.toBeNull();
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('asks a visitor to log in, and brings them back here afterwards', async () => {
    const { el } = await render('anonymous');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('a[href="/login?returnUrl=%2Ffeedback"]')).not.toBeNull();
    expect(el.querySelector('a[href="/register?returnUrl=%2Ffeedback"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Your ideas');
  });

  it('asks an unverified user to confirm their email, and still lists their ideas', async () => {
    const api = new FakeFeedbackApi();
    api.mineResult = () => of([item()]);
    const { el } = await render({ ...USER, emailVerified: false }, api);
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('a[href="/verify-email"]')).not.toBeNull();
    expect(el.querySelector('.idea__title')?.textContent).toBe('Countdown timer');
  });

  it('sends a trimmed idea and puts it at the top of "Your ideas"', async () => {
    const api = new FakeFeedbackApi();
    api.mineResult = () => of([item({ id: 'old', title: 'Older idea' })]);
    const { fixture, el } = await render(USER, api);

    // Feature, Improvement, Bug: `[value]` is a property binding, not an attribute.
    el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    fill(el, '  Faster preview  ', '  Preview takes a while on big pages.  ');
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.sent).toEqual([
      {
        kind: 'improvement',
        area: 'editor',
        title: 'Faster preview',
        body: 'Preview takes a while on big pages.',
        contactOk: false,
      },
    ]);
    const titles = Array.from(el.querySelectorAll('.idea__title')).map((t) => t.textContent);
    expect(titles).toEqual(['Faster preview', 'Older idea']);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Thank you');
  });

  it('does not send a title or description that is only spaces', async () => {
    const { fixture, el, api } = await render(USER);
    fill(el, '     ', '            ');
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.sent).toEqual([]);
    expect(el.querySelectorAll('.field__error').length).toBe(2);
  });

  it('explains the daily limit when the API answers FEEDBACK_LIMIT', async () => {
    const api = new FakeFeedbackApi();
    api.submitResult = () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { status: 429, detail: 'Too Many Requests', code: 'FEEDBACK_LIMIT' },
          }),
      );
    const { fixture, el } = await render(USER, api);
    fill(el, 'Sixth idea', 'One more idea for today.');
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('five ideas');
  });
});

describe('statusView', () => {
  it('words a shipped idea by its reward', () => {
    expect(statusView(item({ status: 'shipped', reward: 'unlock' })).label).toBe(
      'Shipped · free for you',
    );
    expect(statusView(item({ status: 'shipped', reward: 'thanks' })).label).toBe(
      'Shipped · thank you',
    );
  });

  it('tells a late duplicate from one that shares the reward', () => {
    expect(statusView(item({ status: 'duplicate', alreadyPlanned: true })).label).toBe(
      'Already planned',
    );
    expect(statusView(item({ status: 'duplicate', alreadyPlanned: false })).label).toBe(
      'Merged with an earlier idea',
    );
  });
});
