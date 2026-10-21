import { APP_BASE_HREF } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { User } from '../../core/api/auth.api';
import { SessionStore } from '../../core/auth/session.store';
import { AccountPage } from './account-page';
import { PlanSection } from './plan-section';
import { PrivacySection } from './privacy-section';
import { ProfileSection } from './profile-section';
import { SecuritySection } from './security-section';

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

const SECTIONS = ['profile', 'security', 'plan', 'privacy'];

async function render(baseHref: string) {
  // The sections talk to the API; this spec is about the index, so they are stubbed out.
  TestBed.overrideComponent(AccountPage, {
    remove: { imports: [ProfileSection, SecuritySection, PlanSection, PrivacySection] },
    add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'account', component: AccountPage }]),
      { provide: APP_BASE_HREF, useValue: baseHref },
    ],
  });
  TestBed.inject(SessionStore).setUser(ADA);
  const harness = await RouterTestingHarness.create('/account');
  const links = Array.from(
    (harness.routeNativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
      '.cabinet__nav a',
    ),
  );
  return { harness, links };
}

describe('AccountPage section index', () => {
  it('links each section to /account#<section>, not to the base href', async () => {
    const { links } = await render('/');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(SECTIONS.map((s) => `/account#${s}`));
  });

  it('keeps the locale prefix in the Ukrainian build', async () => {
    const { links } = await render('/ua/');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      SECTIONS.map((s) => `/ua/account#${s}`),
    );
  });

  it('stays on the account page when a section is clicked', async () => {
    const { harness, links } = await render('/');
    links[2].click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/account#plan');
  });
});
