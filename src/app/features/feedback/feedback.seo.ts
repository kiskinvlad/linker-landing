import { breadcrumbs } from '../../core/seo/json-ld';
import { RouteSeo } from '../../core/seo/seo.service';

/** Apart from feedback.content.ts so the eager route table doesn't pull in the form's labels. */
export const FEEDBACK_SEO: RouteSeo = {
  title: $localize`:@@feedback.seo.title:Suggest an idea`,
  description: $localize`:@@feedback.seo.description:Suggest a feature, an improvement or a bug fix. If your idea ships as a paid-plan feature, it’s unlocked on your account for free, on any plan.`,
  jsonLd: (siteUrl) => [
    breadcrumbs(siteUrl, [
      { name: $localize`:@@feedback.seo.title:Suggest an idea`, path: '/feedback' },
    ]),
  ],
};
