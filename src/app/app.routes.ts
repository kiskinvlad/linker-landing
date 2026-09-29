import { Routes } from '@angular/router';
import { RouteSeo } from './core/seo/seo.service';
import { LEGAL_DOCS, legalSeo } from './features/legal/legal.content';
import { HOME_SEO } from './features/marketing/home/home.seo';
import { HOW_IT_WORKS_SEO } from './features/marketing/how-it-works/how-it-works.content';
import { PRICING_SEO } from './features/marketing/pricing/pricing.content';

const NOT_FOUND_SEO: RouteSeo = {
  title: 'Page not found',
  description: 'The page you were looking for does not exist.',
  noindex: true,
};

const notFound = () => import('./features/not-found/not-found').then((m) => m.NotFound);
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
  ...LEGAL_DOCS.map((doc) => ({
    path: `legal/${doc.slug}`,
    loadComponent: legalPage,
    data: { seo: legalSeo(doc), doc },
  })),
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
