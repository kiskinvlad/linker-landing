import { RouteSeo } from '../../../core/seo/seo.service';
import { FAQ } from './home.content';

/** Home route SEO + structured data (plan §7). */
export const HOME_SEO: RouteSeo = {
  title: 'Kitlet — on-brand offers and forms that turn visitors into buyers',
  description:
    'Put on-brand offers, signup forms and promo banners on any website in minutes. Design visually, publish with a click, roll back instantly. Free plan, no credit card.',
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
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: productName,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: siteUrl,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};
