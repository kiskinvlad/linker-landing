import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';
import { RouteSeo } from './core/seo/seo.service';
import { LEGAL_DOCS, LEGAL_HUB_SEO, legalSeo } from './features/legal/legal.content';
import { legalDocResolver } from './features/legal/legal-doc.resolver';
import { HOME_SEO } from './features/marketing/home/home.seo';
import { HOW_IT_WORKS_SEO } from './features/marketing/how-it-works/how-it-works.content';
import { PRICING_SEO } from './features/marketing/pricing/pricing.content';

const NOT_FOUND_SEO: RouteSeo = {
  title: $localize`:@@notFound.seo.title:Page not found`,
  description: $localize`:@@notFound.seo.description:The page you were looking for does not exist.`,
  noindex: true,
};

const notFound = () => import('./features/not-found/not-found').then((m) => m.NotFound);
/**
 * Auth pages (plan §3): rendered in the browser only (the `**` server route), never
 * indexed, and — except reset — bounced for visitors who are already signed in.
 */
const authSeo = (title: string): { seo: RouteSeo } => ({
  seo: { title, description: title, noindex: true },
});

const legalPage = () => import('./features/legal/legal-page').then((m) => m.LegalPage);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/marketing/home/home').then((m) => m.Home),
    data: { seo: HOME_SEO },
  },
  {
    path: 'pricing',
    loadComponent: () => import('./features/marketing/pricing/pricing').then((m) => m.Pricing),
    data: { seo: PRICING_SEO },
  },
  {
    path: 'how-it-works',
    loadComponent: () =>
      import('./features/marketing/how-it-works/how-it-works').then((m) => m.HowItWorks),
    data: { seo: HOW_IT_WORKS_SEO },
  },
  {
    path: 'legal',
    loadComponent: () => import('./features/legal/legal-hub-page').then((m) => m.LegalHubPage),
    data: { seo: LEGAL_HUB_SEO },
  },
  ...LEGAL_DOCS.map((doc) => ({
    path: `legal/${doc.slug}`,
    loadComponent: legalPage,
    data: { seo: legalSeo(doc), doc },
    resolve: { rendered: legalDocResolver },
  })),
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
    data: authSeo($localize`:@@login.title:Log in`),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage),
    data: authSeo($localize`:@@register.title:Create your free account`),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password-page').then((m) => m.ForgotPasswordPage),
    data: authSeo($localize`:@@forgot.title:Reset your password`),
  },
  {
    // No guestGuard: someone signed in on this browser may still follow a reset link.
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password-page').then((m) => m.ResetPasswordPage),
    data: authSeo($localize`:@@reset.title:Choose a new password`),
  },
  {
    path: 'verify-email',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/verify-email-page').then((m) => m.VerifyEmailPage),
    data: authSeo($localize`:@@verify.title:Check your inbox`),
  },
  {
    // Public: the emailed link is often opened on a device that is signed in to nothing.
    path: 'verify-email/confirm',
    loadComponent: () =>
      import('./features/auth/verify-email-confirm-page').then((m) => m.VerifyEmailConfirmPage),
    data: authSeo($localize`:@@verify.confirm.seoTitle:Confirm your email`),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account-page').then((m) => m.AccountPage),
    data: authSeo($localize`:@@account.title:Your account`),
  },
  {
    // Prerendered to /404/index.html; the edge serves it with a real 404 status (plan §2).
    path: '404',
    loadComponent: notFound,
    data: { seo: NOT_FOUND_SEO },
  },
  {
    path: '**',
    loadComponent: notFound,
    data: { seo: NOT_FOUND_SEO },
  },
];
