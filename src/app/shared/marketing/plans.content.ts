/**
 * Plan copy shared by the home teaser and /pricing.
 *
 * Free limits mirror the `free` row seeded by the backend migration
 * `AddPlansAndSubscriptions`. Plan §6 wants them read from `GET /billing/plans` at
 * build time; that endpoint arrives with backend Phase 5.
 */
export const FREE_PLAN = {
  name: $localize`:@@plans.free.name:Free`,
  price: '$0',
  features: [
    $localize`:@@plans.free.widgets:1 live widget`,
    $localize`:@@plans.free.views:10,000 widget views a month`,
    $localize`:@@plans.free.versions:10 saved versions with one-click rollback`,
    $localize`:@@plans.free.anySite:Works on any website`,
    $localize`:@@plans.free.analytics:Analytics preview with sample data`,
    $localize`:@@plans.free.ai:AI assistant not included`,
    $localize`:@@plans.free.ideaReward:Paid features you suggest, unlocked for free if we ship them`,
  ],
} as const;

export const PRO_PLAN = {
  name: 'Pro',
  lead: $localize`:@@plans.pro.lead:More widgets, more views and deeper analytics for growing stores.`,
  features: [
    $localize`:@@plans.pro.widgets:More live widgets`,
    $localize`:@@plans.pro.views:Higher monthly view limits`,
    $localize`:@@plans.pro.versions:Longer version history`,
    $localize`:@@plans.pro.analytics:Analytics: views, clicks and conversions by widget, page, country and device`,
    $localize`:@@plans.pro.analyticsHistory:13 months of statistics, export to Excel`,
    $localize`:@@plans.pro.ai:AI assistant: 1,000 credits a month to draft widgets from a sentence`,
  ],
} as const;
