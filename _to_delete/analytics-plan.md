# Analytics: implementation plan

Status: **draft v1** · 2026-10-10

Companion to [`portal-plan.md`](portal-plan.md) (§10 cabinet, §10a feature keys,
§11 backend work) and [`legal-plan.md`](legal-plan.md) (§2.4 widget events). This
file is the spec for the customer analytics dashboard across all three repos:
**linker-backend** (events, rollups, API, XLSX export, campaigns), **linker-editor**
(campaign field, per-widget Stats tab) and **linker-landing** (the `/analytics`
dashboard, sample-data preview, legal text updates).

---

## 1. Locked decisions

| # | Decision |
|---|---|
| A1 | Analytics is a **paid feature**: feature key `analytics`, granted in full to **every paid plan**. No per-plan differences in metrics or history. |
| A2 | The dashboard lives in the **portal** at `/analytics` (lazy, client-rendered, `noindex`). No separate repo or app. The editor gets a small per-widget **Stats** tab that links to it. |
| A3 | **XLSX export** from day one, generated **server-side** (`exceljs`), part of the `analytics` feature. |
| A4 | Events are **collected for every account**, free included (plan quotas count views anyway). Free accounts **see sample data only** (a fixed fixture shipped with the portal); their real data is visible after upgrading. |
| A5 | Retention of aggregated statistics: **13 months on paid plans**, **30 days on the free plan**. Raw events: **7 days**. After a downgrade, paid retention applies for a **30-day grace period**, then free retention. |
| A6 | **Device breakdown** (`mobile` / `tablet` / `desktop`) derived server-side from request headers; the user-agent is never stored. |
| A7 | **Comparison** is in v1: previous period, same period last year, and compare widgets aligned by days since launch. |
| A8 | Widgets are **campaign-like** (typical lifetime about one month). The dashboard is built around a widget's lifetime ("Since launch"), not only calendar ranges. |
| A9 | **Campaigns**: an optional, per-customer named group of widgets (e.g. "Black Friday"), a real table, not free text. Assigned in the editor and the portal. |
| A10 | No visitor identifier anywhere (Cookie Policy promise). Metrics are **counts and rates**, never "unique visitors". The UI says "views", not "visitors". |

---

## 2. Concepts

### 2.1 Events (input)

The embed script's payload is unchanged: `{ type, pageUrl }` (plus `value` for
`vote`, phase 2). The server adds the rest when the event arrives and stores:

| Field | Source | Notes |
|---|---|---|
| `widget_id` | URL of the public events endpoint | must be a published, active widget |
| `type` | payload | `view` · `click` · `close` · `submit` · `vote` (phase 2, §10) |
| `occurred_at` | server clock | never trust a client timestamp |
| `page_path` | payload `pageUrl` | normalised: lowercase host + path, **query string and fragment removed**, trailing slash trimmed, max 512 chars |
| `country` | `CloudFront-Viewer-Country` header in production; local GeoIP fallback in dev; `ZZ` if unknown | the IP is used for this and for rate limiting, then dropped |
| `device` | `CloudFront-Is-Mobile-Viewer` / `-Is-Tablet-Viewer` / `-Is-Desktop-Viewer` headers in production; user-agent fallback | `mobile` · `tablet` · `desktop` · `unknown`; the UA string is never stored |
| `value` | payload, `vote` only | small int (rating 1–5, NPS 0–10, reaction −1/+1) |

Bots are dropped on arrival (`isbot` on the user-agent).

Resolve country and device through one port, `ViewerContextResolver`, with a
`CloudFrontHeadersAdapter` (production) and a `UserAgentAdapter` (dev/fallback).
If you parse user-agents, use a permissively licensed parser: **`ua-parser-js` v2 is
AGPL**, so pin v1 (MIT) or use `bowser` (MIT).

### 2.2 Metrics (output)

Defined once, in the backend, as **Strategy** objects (`MetricDefinition`), and
used by the API, the export and the tests:

| Metric | Formula | Format |
|---|---|---|
| Views | Σ view | integer |
| Clicks | Σ click | integer |
| Closes | Σ close | integer |
| Submissions | Σ submit | integer |
| CTR | clicks / views | percent, 1 decimal |
| Conversion | submissions / views | percent, 1 decimal |
| Close rate | closes / views | percent, 1 decimal |

Rates are always computed from summed counts over the selected range, **never
averaged across buckets**. Division by zero → `null` (shown as "—").

### 2.3 Dimensions

`widget` · `campaign` (via the widget's **current** campaign) · `page_path` ·
`country` · `device` · time bucket.

### 2.4 Widget lifecycle

- `first_published_at`: set once, on the first publish. **Launch** = this moment.
- `ended_at`: set when the widget is unpublished, cleared when it is republished.
- Status shown in analytics: **Live** (published), **Ended** (was published, now
  isn't), **Draft** (never published: hidden from analytics), **Deleted**
  (soft-deleted; stats kept for the retention period, name shown with "(deleted)").
- "Since launch" range = `first_published_at` → `ended_at ?? now`.
- **Scheduling** (start and end dates on a widget) is **out of scope** here. If it
  is added later, analytics gains a **Scheduled** status and "Ends in N days".

### 2.5 Campaigns

- A campaign belongs to one customer; a widget has zero or one campaign.
- Campaign lifetime = earliest launch → latest end of its widgets.
- Changing a widget's campaign **regroups its whole history** (rollups don't store
  the campaign), needs no republish and no publish attestation.

---

## 3. Data model (linker-backend)

```ts
// campaigns
id uuid pk, user_id fk, name text (1..60, trimmed), created_at, archived_at null
unique (user_id, lower(name))

// widgets (additions; check what exists first)
+ campaign_id uuid fk null references campaigns on delete set null
+ first_published_at timestamptz null
+ ended_at timestamptz null
+ deleted_at timestamptz null        // soft delete, if widgets are hard-deleted today

// widget_events: raw, short-lived (7 days)
id bigserial, widget_id, type, occurred_at, page_path, country char(2), device, value smallint null
index (occurred_at), index (widget_id, occurred_at)
// consider monthly/daily partitions so retention is DROP PARTITION, not DELETE

// widget_events_hourly: the only table analytics queries read
widget_id, hour_utc timestamptz, type, page_path, country, device, count int
primary key (widget_id, hour_utc, type, page_path, country, device)

// widget_votes_hourly (phase 2): widget_id, hour_utc, value, count
```

**Pipeline**

1. **Ingest**: the public events endpoint validates, enriches (§2.1), rate-limits
   per widget and per IP, inserts into `widget_events`. It must stay fast: no
   joins, no rollup work in the request.
2. **Rollup job** (every 5 minutes, BullMQ repeatable job or `@nestjs/schedule`):
   recomputes the **last 3 hours** of `widget_events_hourly` from raw events with an
   upsert (`INSERT … ON CONFLICT DO UPDATE SET count = EXCLUDED.count`).
   Recomputing, not incrementing, makes it **idempotent**: a re-run or overlap
   can't double-count, and late events are picked up. Store the watermark
   (`analytics_rollup_state.last_completed_at`) for the dashboard's "Updated N min
   ago".
3. **Retention job** (daily):
   - raw events older than 7 days → deleted (or partition dropped);
   - hourly rollups older than **13 months** for accounts with `analytics`;
   - older than **30 days** for accounts without it, unless they are inside the
     30-day downgrade grace period (needs `analytics_grace_until` on the account or
     a subscription history the job can read);
   - deleted accounts are handled by the existing 30-day purge job (legal-plan
     §2.4): it must also delete their events, rollups and campaigns.
   Idempotent and logged, like the purge job.

**Timezones.** Rollups are hourly in UTC; the API groups them into the customer's
local days with the request's IANA `tz` (validated against `Intl.supportedValuesOf
('timeZone')`; default UTC), so days are correct for US and Asian customers and
across DST changes. Time zones with 30/45-minute offsets (India, Nepal, parts of
Australia) are approximated to the containing UTC hour; say so in a code comment
and in the XLSX Summary sheet.

**Volume.** Widgets live about a month, and only combinations that actually occur
get a row, so rollups stay small. If they don't: compact rows older than 90 days to
daily rows, or move the rollup table to ClickHouse/Timescale behind the same
repository. The API doesn't change.

---

## 4. Access, plans and retention

- `EntitlementsService.has(userId, 'analytics')` (portal-plan §10a; pick one
  method name) gates every `/analytics/*` route through an `AnalyticsEntitlementGuard`.
  Without it → **403** `{ code: 'PLAN_REQUIRED', feature: 'analytics' }`.
- **Billing (Phase 5) doesn't exist yet.** Until it does, the entitlement is a stub:
  `true` for any non-`free` plan code, plus an env override
  `ANALYTICS_FORCE_ENABLED=true` for dev. Never enabled by default in production.
- Every query is **scoped to the caller's widgets**. `widgetIds` / `campaignIds`
  that aren't the caller's are dropped, not errored (no existence oracle). Cover
  this IDOR rule with e2e tests.
- Ranges are **clamped** to the retention window. Responses carry
  `retention: { from }` so the UI can say "History starts on 12 Sep 2025".
- Feature key `analytics` is also unlockable through the feedback program (§10a),
  like any other key.

---

## 5. API contract

All routes: authenticated, verified email, `analytics` entitlement. Common query:
`from`, `to` (ISO dates, inclusive local days), `tz`, `widgetIds[]`,
`campaignIds[]`, `status[]` (`live|ended|deleted`), `compare`
(`none|previous|year`).

**Granularity** (server-chosen, returned in the response): `hour` if the range is
≤ 2 days, `day` if ≤ 92 days, otherwise `week` (ISO weeks).

```ts
type Kpis = { views: number; clicks: number; closes: number; submissions: number;
              ctr: number | null; conversion: number | null; closeRate: number | null };

// GET /analytics/overview
{ range: { from, to, tz, granularity }, retention: { from },
  updatedAt,                                   // rollup watermark
  kpis: { current: Kpis, previous?: Kpis },
  series: { bucket: string; views; clicks; closes; submissions }[],
  previousSeries?: { … }[],                    // aligned by position in range
  previousRange?: { from, to } }

// GET /analytics/widgets   (one row per widget, sorted server-side; page + pageSize)
{ rows: { id, name, status, campaign: { id, name } | null,
          launchedAt, endedAt, kpis: Kpis, previous?: Kpis,
          sparkline: number[] /* daily views in range */ }[],
  total }

// GET /analytics/breakdown?dimension=page|country|device&limit=50
{ rows: { key: string; kpis: Kpis; previous?: Kpis }[], other?: Kpis }

// GET /analytics/compare-widgets?widgetIds=a,b,c&days=30   (2–3 widgets)
{ widgets: { id, name, launchedAt,
             series: { day: number /* 1-based since launch */; views; clicks; submissions }[] }[] }

// GET /analytics/campaigns/compare?campaignIds=a,b   (same shape, aligned by days since campaign start)

// GET /analytics/export.xlsx   (same query as overview) → file, see §6

// Campaigns (any plan: free users can organise widgets too)
GET    /campaigns                → { id, name, widgetCount, archivedAt }[]
POST   /campaigns { name }       → 201 | 409 CAMPAIGN_NAME_TAKEN
PATCH  /campaigns/:id { name?, archived? }
PATCH  /widgets/:id { campaignId: string | null }   // no republish, no attestation
// Widget DTO gains: campaign: { id, name } | null, firstPublishedAt, endedAt
```

Comparison rules:
- `previous` = the same number of local days immediately before `from`.
- `year` = the same local dates one year earlier (29 Feb → 28 Feb).
- If the comparison range starts before the account existed or before retention,
  `previous` KPIs are `null` and the UI shows "No data".
- Deltas are computed in the UI from `current` and `previous`. Previous = 0 and
  current > 0 → "New", not "+∞%".

Caching: responses are per user and per query. Cache them in Redis for 60 s keyed
on the normalised query; the rollup cadence is 5 minutes anyway.

---

## 6. XLSX export

- `GET /analytics/export.xlsx` with the dashboard's query. Generated with
  **`exceljs` streaming `WorkbookWriter`** straight into the response.
- `Content-Disposition: attachment; filename="kitlet-analytics_<from>_<to>.xlsx"`.
- Rate limit: 10 exports per account per hour → 429 `EXPORT_RATE_LIMITED`.
- Same aggregation code and metric definitions as the API, so numbers match the
  dashboard exactly. Add a test that compares them.

| Sheet | Contents |
|---|---|
| `Summary` | Product name, account email, generated at, range, timezone (+ the half-hour-offset note when relevant), filters (widgets, campaigns, statuses), comparison mode, then KPIs: Metric · Current · Previous · Δ % |
| `Daily` | One row per local day (or hour for ≤ 2-day ranges) per widget: date, widget, campaign, views, clicks, closes, submissions, CTR, conversion; plus previous-period rows with a `Period` column when comparing |
| `Widgets` | The widgets table: name, status, campaign, launched, ended, KPIs, previous KPIs, Δ % |
| `Pages` | page_path + KPIs (top 1,000; the rest summed as "Other") |
| `Countries` | ISO code, country name (English), KPIs |
| `Devices` | mobile / tablet / desktop / unknown + KPIs |
| `Votes` | phase 2: widget, value, count, share |

Formatting: bold frozen header row, autofilter, column widths, `0.0%` for rates,
`yyyy-mm-dd` dates, `#,##0` counts.

**Formula injection:** widget names, campaign names and page paths are customer- or
visitor-controlled. Write them as string cells, and prefix any value starting with
`=`, `+`, `-`, `@`, tab or CR with `'`. Unit-test it.

Later (not v1): async export via queue + emailed link for very large ranges; CSV;
an automatic "Your campaign results" email with the XLSX when a widget ends.

---

## 7. Portal: the `/analytics` dashboard (linker-landing)

### 7.1 Routes and access

| Route | Content |
|---|---|
| `/analytics` | Account dashboard |
| `/analytics/widgets/:id` | Single widget, default range "Since launch" |
| `/analytics/compare?widgets=a,b,c` | Compare widgets by days since launch |

- Client-rendered (the existing `**` server route), `noindex`, behind `authGuard`
  and a **verified-email** guard (the editor requires verification too, and an
  unverified account has no widgets).
- Header: an "Analytics" link for signed-in users.
- `feature-names.ts`: add `analytics: "Analytics"`. Pricing page: list Analytics
  and XLSX export on every paid plan.
- Lazy chunk only: no analytics, chart or grid code may reach marketing pages. The
  Lighthouse budgets enforce it.

### 7.2 Layout

```
┌ Filters: [Range ▾] [Compare ▾] [Campaign ▾] [Widgets ▾] [Status ▾]   [Export XLSX] ┐
├ KPI tiles: Views · Clicks · CTR · Submissions · Conversion  (Δ vs comparison)        ┤
├ Trend chart: metric switcher, previous period as a dashed line, tooltip with both dates ┤
├ Widgets table: name, status, campaign, launched, views, clicks, CTR, subs, conv., Δ, sparkline ┤
├ Top pages                        │ Countries                  │ Devices               ┤
└ "Updated 4 min ago" · "History starts on …"                                        ┘
```

- **Range presets:** Today, Last 7 days, Last 30 days, Last 90 days, This month,
  Last month, Custom; on a widget page also **Since launch** (default).
- **Compare:** Off · Previous period · Same period last year. "Compare widgets"
  is a table action: select 2–3 rows → `/analytics/compare`.
- **Campaign filter** with inline manage: rename, archive. Assign a campaign to
  selected widgets from the table.
- **Widget detail:** the same blocks scoped to one widget, plus lifecycle (launched,
  ended or "Live for 12 days") and an "Open in editor" link.
- **Empty states:** no widgets yet → link to the editor; widgets but no events yet →
  "Data appears within about 5 minutes of the first view".
- **Mobile:** KPI tiles two per row, the table becomes cards, charts full width.
- **Accessibility:** each chart has a text summary and a "View as table" toggle;
  deltas are not colour-only (arrow + sign + text); the date picker is keyboard
  operable; respect `prefers-reduced-motion` for chart animation.

### 7.3 Code structure

```
src/app/features/analytics/
  analytics.routes.ts            // lazy routes + providers
  data/
    analytics.models.ts          // DTOs mirroring §5
    analytics-source.ts          // ANALYTICS_SOURCE token + AnalyticsSource interface
    api-analytics.source.ts      // HttpClient implementation
    sample-analytics.source.ts   // free plan: serves the fixture
    sample-analytics.fixture.ts  // seeded, deterministic sample data
  state/
    analytics.facade.ts          // signal store: filters ⇄ URL query params, resources
  ui/
    filter-bar, kpi-tile, trend-chart, widgets-table, breakdown-card, upgrade-banner
  shared/
    kit-chart.component.ts       // the only place ECharts is imported
```

- **Strategy via DI:** the route provides `ANALYTICS_SOURCE` with a factory:
  `analytics` entitlement → `ApiAnalyticsSource`, otherwise
  `SampleAnalyticsSource`. Components never know which one they got, so the preview
  can't drift from the real dashboard.
- **Facade + signals:** `AnalyticsFacade` owns the filter state, **synced to the
  URL query** (bookmarkable, shareable, back button works), and exposes computed
  signals; components don't fetch.
- **Charts:** Apache ECharts via `ngx-echarts`, importing only the line and bar
  charts and the needed components (tree-shaken `echarts/core`), wrapped in
  `<kit-chart>` (Adapter) so the library can be swapped. Colours come from the
  design tokens (CSS variables), including dark mode.
- **Table:** `@tanstack/angular-table` (headless, MIT), styled with the tokens;
  sorting and pagination happen on the server.
- Check that both libraries support Angular 22 before adding them; if one doesn't,
  say so and propose an alternative, don't pin an old Angular.
- **Export:** a plain `<a href>` to `${apiUrl}/analytics/export.xlsx?…` built from
  the current filters. The session cookie goes along on the same-site top-level
  GET; no blob handling.
- **Formatting:** `Intl.NumberFormat` / `Intl.DateTimeFormat` (as the account area
  does), with the browser's time zone sent as `tz`.
- **i18n:** all strings via `$localize`; run `pnpm i18n:extract`.

### 7.4 Sample data (free plan)

- `sample-analytics.fixture.ts`: a fixed dataset generated once with a seeded PRNG
  (no API call): about 6 widgets over 60 days, two campaigns ("Black Friday",
  "Spring sale"), realistic weekday/weekend shape, pages, countries, devices, and
  a previous-period set so comparison works.
- Always labelled: a persistent **"Sample data"** banner with the upgrade
  call-to-action, and a light "Sample" watermark on charts. No real numbers appear,
  blurred or otherwise.
- Export button disabled with the tooltip "Available on paid plans".
- After an upgrade the source switches on the next navigation; the banner says
  "Your last 30 days are ready" when real data exists.

---

## 8. Editor (linker-editor)

1. **Campaign field.** In widget settings, a new section **"Campaign"**: a combobox
   listing the customer's campaigns, with "Create “…”" when the typed name doesn't
   exist (`POST /campaigns`). Optional; clearing it sets `campaignId: null`. Saving
   uses `PATCH /widgets/:id { campaignId }` and never triggers republish or the
   publish attestation. Available on **every plan**. Leave room in the section for
   start/end dates if scheduling arrives later.
2. **Duplicate keeps the campaign.** "Duplicate widget" copies `campaignId`.
3. **Stats tab** per widget:
   - paid: views, clicks, CTR, submissions since launch and a 30-day sparkline
     (`GET /analytics/widgets?widgetIds=<id>&from=<launch>`), plus "Open full
     analytics" → `/analytics/widgets/<id>` (same-origin full-page link);
   - free: a short locked state, "See how this widget performs", linking to
     `/analytics` (which shows the sample preview and upgrade);
   - draft widget: "Stats appear after you publish".
4. **Embed runtime:** no change for v1. Phase 2 adds the `vote` event for rating
   and reaction elements (§10).

---

## 9. Legal text changes (linker-landing)

The current texts promise "aggregated statistics: for the life of the account" and
mention only a coarse country. Update them to match A5 and A6:

- `src/app/features/legal/docs/dpa.md`, Annex I:
  - **Categories of personal data**: add "device type (mobile, tablet or desktop)
    derived from the user-agent, which is not stored"; describe the page URL as
    "page address without query string".
  - **Retention**: replace "Aggregated statistics: for the life of the account" with
    "Raw widget interaction events: up to 7 days. Aggregated statistics: up to 13
    months on paid plans and up to 30 days on the free plan (13 months for 30 days
    after a downgrade); deleted with the account as set out in section 9."
- `src/app/features/legal/docs/cookies.md`, "Delivery data": "…derive a coarse
  country **and device type (mobile, tablet or desktop)** for statistics; we do not
  store IP addresses or user-agent strings alongside widget statistics."
- `src/app/features/legal/docs/privacy.md`: check for any statement about widget
  statistics or their retention and align it; otherwise unchanged (visitor data is
  covered by the DPA, where we are processor).
- `docs/legal-plan.md` §2.4: add device type and the retention periods to the
  event payload paragraph.
- Bump the `version` of each changed document in `legal.content.ts`. Texts are not
  final yet (`LEGAL_TEXTS_FINAL = false`), so no 30-day notice is needed; after
  launch, a change like this would need it.

---

## 10. Phase 2: element results (with the element presets)

When the rating and reaction elements ship:
- events endpoint accepts `{ type: 'vote', value, pageUrl }`, validated per element
  (rating 1–5, NPS 0–10, reaction −1/+1); repeat votes blocked in the browser with
  `localStorage` key `kit_voted_<widgetId>` (allowed by the Cookie Policy), rate
  limit per IP on the server;
- `widget_votes_hourly` rollup; `GET /analytics/votes?widgetIds=…` → distribution,
  average (rating) or score (NPS), up/down split;
- dashboard block "Element results" and the `Votes` export sheet.

---

## 11. Milestones

| # | Milestone | Repo | Done when |
|---|---|---|---|
| AN0 | Plan and legal texts | landing | This file merged; §9 text changes merged |
| AN1 | Data | backend | Ingest enrichment (page, country, device, bots), `widget_events` + hourly rollup job + retention job, lifecycle fields, campaigns table + endpoints, entitlement stub; unit + e2e tests |
| AN2 | Read API + export | backend | §5 endpoints incl. compare modes, IDOR tests, XLSX export (§6) with formula-injection and dashboard-parity tests |
| AN3 | Editor | editor | Campaign field, duplicate keeps campaign, Stats tab (paid / free / draft states) |
| AN4 | Dashboard | landing | `/analytics`, widget detail, compare page, sample source, export link, a11y, i18n; can start in parallel with AN1–2 using the sample source |
| AN5 | Phase 2 | all | Vote events, results block, Votes sheet (with the element presets) |
| AN6 | Later | backend | Async export, CSV, campaign-end results email |

Order: **AN0 → AN1 → AN2 → AN3 / AN4** (AN4's UI can be built against the sample
source while AN1–2 are in progress).

---

## 12. Testing

- **Backend unit:** metric strategies (zero division, rates from sums); local-day
  bucketing across DST changes and for `America/Los_Angeles`, `Asia/Tokyo`,
  `Asia/Kolkata`; comparison range maths (incl. 29 Feb); `page_path` normalisation;
  device resolution from CloudFront headers and UA fallback; rollup idempotency
  (run twice → same counts; late event picked up); retention job (paid, free,
  grace period); formula-injection escaping.
- **Backend e2e:** entitlement 403; IDOR (foreign widget/campaign ids silently
  dropped); retention clamping; export returns a valid workbook whose Summary KPIs
  equal `/analytics/overview` (read it back with `exceljs`).
- **Portal unit:** facade ⇄ URL sync; source selection by entitlement; delta
  formatting ("New", "No data", sign + arrow); sample fixture is deterministic.
- **Portal e2e (Playwright, when the suite exists):** free user sees the sample
  banner and a disabled export; paid user changes the range and the URL updates; the
  export link downloads an `.xlsx`.
- **Performance:** Lighthouse budgets on marketing pages unchanged (no analytics
  code in their chunks).

---

## 13. Open items

1. Billing (Phase 5) and `EntitlementsService`: the stub in §4 until it lands.
2. Widget scheduling (start/end dates): not in this plan; analytics is ready for it.
3. Where the account's preferred time zone lives: v1 uses the browser's; a profile
   setting can come later (needed for the campaign-end email).
