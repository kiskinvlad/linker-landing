# linker-landing

The public portal of the Linker platform, shipped under the product name **Kitlet**:
marketing landing, and later auth, the account cabinet and legal pages. The plan is
[`docs/portal-plan.md`](docs/portal-plan.md); the brand logos are in `brand/logos/`.

Angular 22, marketing routes prerendered at build time, `outputMode: "static"` — no
Node server in production; a CDN serves `dist/kitlet-portal/browser/`.

```bash
pnpm install
pnpm start     # dev server on http://localhost:4000
pnpm build     # static output in dist/kitlet-portal/browser
pnpm test      # Vitest unit tests
pnpm lint      # oxlint --type-aware
pnpm format    # prettier --write (CI runs format:check)
pnpm start:ua  # dev server in Ukrainian (ng serve runs one language at a time)
pnpm i18n:extract  # regenerate the English vocabulary and check every translation
```

## Languages

English at `/`, Ukrainian at `/ua/` (plan D4), built with Angular i18n: each
language is its own prerendered build. Every string carries a label —
`i18n="@@home.hero.title"` in templates, `` $localize`:@@nav.pricing:Pricing` `` in
TypeScript — and the label is its key in the vocabularies under `src/locale/`:

- `messages.json` — English source, **generated** by `pnpm i18n:extract`; don't edit.
- `messages.uk.json` — Ukrainian; add a translation for every new label.

Placeholders such as `{$INTERPOLATION}` or `{$START_TAG_SPAN}…{$CLOSE_TAG_SPAN}` must
survive translation unchanged; `{$INTERPOLATION}` is the product name everywhere it
appears except `footer.copyright`, where it is the year (then `{$INTERPOLATION_1}` is
the product name). The build fails on a missing translation, and CI also fails on a
stale source file, a stale label or a broken placeholder.

The visitor's language: an explicit choice from the header switcher (`kit_lang`
cookie) wins, then the browser's language list, then English — the inline script
at the top of `src/index.html`. Adding a language: `src/app/core/i18n/locales.ts`
has the checklist.

## Accounts (log in, sign up, password reset, verification, account area)

Plan §3/§5/§10. `/login`, `/register`, `/forgot-password` and `/reset-password`
talk to linker-backend's `/api/v1/auth` through `AuthApi` (`core/api`), with the
session in an httpOnly cookie on the API origin. `SessionStore` holds who is signed
in; `/auth/me` is asked once on startup without blocking hydration, so the header
switches to the account menu when the answer lands. Guards are convenience — the
API is the boundary. `returnUrl` only accepts same-origin paths (`safeReturnUrl`),
and `/editor/` is reached by a full page load.

The API URL comes from `APP_IDENTITY.apiUrl`: `http://localhost:3000/api/v1` in dev,
**none in production until the real domain exists (M8)** — the `linker.com`
placeholder belongs to someone else, so a production build calls no API at all.

Sign-up lands on `/verify-email` ("check your inbox"); the email's link opens
`/verify-email/confirm`, which works signed out too. An unverified visitor can use
the whole portal, but "Open editor" and a returnUrl to `/editor/` stop at
`/verify-email` first (plan D9), and the header shows a reminder until confirmed.
`/account` holds profile, password and devices, plan, cookie choices, terms status
and account deletion (email typed out + password), through `AccountApi`.

The error interceptor signs the visitor out on any API 401 except on the three
routes that check a password (login, password change, account deletion), where a
401 means a wrong password.

Running against a local backend needs these settings in linker-backend's `.env`
(its `.env.example` has them since M4):

```ini
CORS_ORIGINS=http://localhost:4000
MAIL_RESET_URL_BASE=http://localhost:4000/reset-password
MAIL_VERIFY_URL_BASE=http://localhost:4000/verify-email/confirm
```

`pnpm cli users:verify <email>` in linker-backend confirms an address without the
email.

(add `,http://localhost:4200` to `CORS_ORIGINS` to keep the editor working too).
Reset emails land in Mailpit at http://localhost:8025.

## Cookies and analytics

Plan §8. A browser-only bottom sheet (`layout/cookie-banner`) asks once: Accept all /
Reject all / Customize, equal weight, nothing pre-ticked. The choice lives in the
`linker_consent` cookie (`{ v, analytics, ts }`, 12 months); bumping
`CONSENT_POLICY_VERSION` asks everyone again. The footer's "Cookie settings" and "Your
privacy choices" reopen it. Global Privacy Control is honoured as an opt-out.

Google Analytics 4 runs in strict consent mode: `src/index.html` defaults every
consent type to denied, and `Ga4Loader` injects `gtag.js` only after analytics is
granted, sends page views without query strings, and deletes `_ga*` cookies on
withdrawal. **GA4 stays off until a measurement ID is set** in `ANALYTICS_CONFIG`
(`src/app/core/consent/ga4.loader.ts`). CI fails if any prerendered page references
Google Tag Manager or has the banner baked in.

CI (`.github/workflows/ci.yml`) runs format check, lint, build and tests on every
PR to `develop`/`main`, and fails if a marketing page stops being prerendered.
It then runs `pnpm lighthouse` (Lighthouse CI against the static build) with the
plan §7 budgets from `lighthouserc.json`; reports are attached to the run as the
`lighthouse-reports` artifact.

One blind spot: sections below the fold start at `opacity: 0` until scrolled
into view (`RevealDirective`), and Lighthouse never scrolls, so its colour-contrast
audit skips them. Check contrast on new below-the-fold content by hand.

`pnpm build` also runs `scripts/optimize-html.mjs` (font preloads with their
`@font-face` rules inlined, low-priority JS). Each change there was measured with
Lighthouse; the numbers are in its header.

On Windows, Lighthouse CI can abort mid-run with `EPERM` while Chrome cleans up
its temp profile — a local flake, not a page problem; CI runs on Linux. Collect one
URL at a time with `lhci collect --additive` if it keeps happening.

`pnpm build` also writes `sitemap.xml` and `robots.txt`
(`scripts/generate-seo-files.mjs`), built from the canonical URL of each
prerendered page, so `noindex` pages are left out automatically.

The domain comes from `APP_IDENTITY` (`src/app/core/config/app-identity.ts`) and is
the `linker.com` placeholder until the Kitlet domain is registered (plan milestone M8).
