/**
 * Plan copy shared by the home teaser and /pricing.
 *
 * Free limits mirror the `free` row seeded by the backend migration
 * `AddPlansAndSubscriptions`. Plan §6 wants them read from `GET /billing/plans` at
 * build time; that endpoint arrives with backend Phase 5.
 */
export const FREE_PLAN = {
  name: 'Free',
  price: '$0',
  features: [
    '1 live widget',
    '10,000 widget views a month',
    '10 saved versions with one-click rollback',
    'Works on any website',
    'Paid features you suggest, unlocked for free if we ship them',
  ],
} as const;

export const PRO_PLAN = {
  name: 'Pro',
  lead: 'More widgets, more views and deeper analytics for growing stores.',
  features: ['More live widgets', 'Higher monthly view limits', 'Longer version history'],
} as const;
