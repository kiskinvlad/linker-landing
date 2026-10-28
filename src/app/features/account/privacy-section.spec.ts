import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { LegalStatus, User } from '../../core/api/auth.api';
import { AccountFacade } from '../../core/auth/account.facade';
import { ConsentService } from '../../core/consent/consent.service';
import { PrivacySection } from './privacy-section';

const ADA: User = {
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

const OUTDATED: LegalStatus = {
  termsVersionCurrent: '2026-10-25',
  termsVersionAccepted: '2026-10-01',
  termsAcceptedAt: '2026-10-19T09:00:00.000Z',
  requiresTermsAcceptance: true,
};

function render(legal: LegalStatus, acceptTerms: () => Promise<void> = () => Promise.resolve()) {
  const account = { acceptTerms: vi.fn(acceptTerms) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AccountFacade, useValue: account },
      { provide: ConsentService, useValue: { openSettings: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(PrivacySection);
  fixture.componentRef.setInput('user', { ...ADA, legal });
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const acceptButton = () =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Accept the Terms'));
  return { fixture, el, account, acceptButton };
}

describe('PrivacySection terms', () => {
  it('offers to accept a newer version, keeping the earlier acceptance', () => {
    const { el, acceptButton } = render(OUTDATED);

    expect(el.textContent).toContain('You accepted version 2026-10-01');
    expect(el.textContent).toContain('Version 2026-10-25 of the Terms of Service is now in effect');
    expect(acceptButton()).toBeDefined();
  });

  it('accepts the version the API reports as current', async () => {
    const { fixture, account, acceptButton } = render(OUTDATED);

    acceptButton()!.click();
    await fixture.whenStable();

    expect(account.acceptTerms).toHaveBeenCalledWith('2026-10-25');
  });

  it('shows a refusal and keeps the button', async () => {
    const { fixture, el, acceptButton } = render(OUTDATED, () =>
      Promise.reject(new ApiError(409, 'That version is no longer current.', [], null, 'CONFLICT')),
    );

    acceptButton()!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(acceptButton()!.disabled).toBe(false);
  });

  it('offers nothing once the current version is accepted', () => {
    const { el, acceptButton } = render({
      ...OUTDATED,
      termsVersionAccepted: '2026-10-25',
      requiresTermsAcceptance: false,
    });

    expect(acceptButton()).toBeUndefined();
    expect(el.textContent).not.toContain('first time you open the editor');
  });
});
