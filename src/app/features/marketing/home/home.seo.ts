import { faqPage, softwareApplication } from '../../../core/seo/json-ld';
import { RouteSeo } from '../../../core/seo/seo.service';
import { FAQ } from './home.content';

/** Home route SEO + structured data (plan §7). */
export const HOME_SEO: RouteSeo = {
  title: (productName) =>
    $localize`:@@home.seo.title:${productName}:productName: — on-brand offers and forms that turn visitors into buyers`,
  description: $localize`:@@home.seo.description:Put on-brand offers, signup forms and promo banners on any website in minutes. Design visually, publish with a click, roll back instantly. Free plan, no credit card.`,
  path: '/',
  jsonLd: (siteUrl, productName) => [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: productName,
      url: siteUrl,
      logo: `${siteUrl}/kitlet-mark.svg`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: productName,
      url: siteUrl,
    },
    softwareApplication(siteUrl, productName),
    faqPage(FAQ),
  ],
};
