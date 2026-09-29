import { Routes } from '@angular/router';
import { RouteSeo } from './core/seo/seo.service';
import { HOME_SEO } from './features/marketing/home/home.seo';

const NOT_FOUND_SEO: RouteSeo = {
  title: 'Page not found',
  description: 'The page you were looking for does not exist.',
  noindex: true,
};

const notFound = () => import('./features/not-found/not-found').then((m) => m.NotFound);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/marketing/home/home').then((m) => m.Home),
    data: { seo: HOME_SEO },
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
