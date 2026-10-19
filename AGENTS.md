# linker-landing: agent guide

The **portal** of Linker (product name Kitlet), served at `/` (Ukrainian at `/ua/`). It holds:
- the marketing pages (prerendered): home, pricing, how-it-works;
- sign-up, login, password reset and email verification;
- the account area: profile, security, plan, privacy, deletion;
- the Feedback Program, the legal center, and cookie consent + GA4;
- the `@kiskinvlad/linker-tokens` design-token package (`packages/tokens`).

It links to the editor (`/editor/`) and analytics (`/analytics/`), which are separate apps on the
same origin.

How this fits with the other repos, and the contracts it relies on, are in the hub
[linker-root](https://github.com/kiskinvlad/linker-root):
- [architecture](https://github.com/kiskinvlad/linker-root/blob/main/docs/architecture.md);
- [auth-api.md](https://github.com/kiskinvlad/linker-root/blob/main/docs/contracts/auth-api.md);
- [api.md](https://github.com/kiskinvlad/linker-root/blob/main/docs/contracts/api.md);
- [analytics-events.md §2](https://github.com/kiskinvlad/linker-root/blob/main/docs/contracts/analytics-events.md)
  (GA4).

## Stack

Angular 22, standalone components + signals. Marketing routes are prerendered; the output is
static (`outputMode: "static"`, no Node server). Angular i18n: one build per language (English,
Ukrainian). Vitest, oxlint `--type-aware`, Prettier. **pnpm** (workspace with
`packages/tokens`). Node 24 (`.nvmrc`).

## Commands

```bash
pnpm install
pnpm start          # http://localhost:4000; proxies /editor → :4200, /analytics → :4400, /ua/analytics → :4401, /ua → :4001
pnpm start:ua       # Ukrainian build on :4001/ua/ (run beside `pnpm start`)
pnpm format:check   # CI; `pnpm format` to fix
pnpm lint
pnpm test
pnpm build          # static output in dist/kitlet-portal/browser (+ HTML optimisation, sitemap/robots)
pnpm i18n:extract   # regenerate src/locale/messages.json and check every translation
pnpm lighthouse     # Lighthouse CI against the build (budgets in lighthouserc.json)
```

Run it with the API and the other apps from linker-root: `scripts/dev.sh backend landing`
(add `landing-ua editor analytics …`). See
[local-dev.md](https://github.com/kiskinvlad/linker-root/blob/main/docs/local-dev.md).

## Key folders (`src/app`)

```
core/api/        AuthApi, AccountApi, FeedbackApi: the linker-backend clients
core/auth/       SessionStore, guards, return-url rules (same-origin only; other apps = full-page load)
core/config/     APP_IDENTITY: product name, apiUrl, editorPath, analyticsPath
core/consent/    cookie consent, Ga4Loader (typed events, only after consent)
core/i18n/       locales and the language redirect rules
features/        marketing, auth, account, feedback, legal (texts in features/legal/docs/*.md), not-found
layout/          site header (Open editor / Analytics pills), footer, cookie banner, language switcher
packages/tokens/ @kiskinvlad/linker-tokens (published to GitHub Packages; used here and by linker-analytics)
```

## Read this when…

| Task | Read |
|---|---|
| Accounts, i18n, the editor/analytics mounting, Feedback Program, cookies and GA4, Lighthouse | [README.md](README.md), the section for your area |
| Product decisions, IA, SEO, consent, the terms gate, cabinet, feedback rewards, infra | [docs/portal-plan.md](docs/portal-plan.md) |
| The legal texts, and the controls they promise in the backend and editor | [docs/legal-plan.md](docs/legal-plan.md), `src/app/features/legal/docs/` |
| Auth screens, interceptors, `401` handling | linker-root [auth-api.md](https://github.com/kiskinvlad/linker-root/blob/main/docs/contracts/auth-api.md) |
| Tokens package | [packages/tokens/README.md](packages/tokens/README.md) |
| Adding a language | `src/app/core/i18n/locales.ts` (its checklist) |

## Rules that matter most

- **Prerendered pages** must render without the browser or the session. Session-dependent UI
  fills in after `/auth/me` answers.
- **Every string** has an `@@id` (`i18n="@@…"`, `` $localize`:@@…:…` ``). Run `pnpm i18n:extract`
  and translate in `src/locale/messages.uk.json`; the build fails on a missing translation.
  Placeholders survive translation unchanged. Counts are ICU plurals. Use logical CSS properties.
- **Cross-app links** (`/editor/`, `/analytics/`, `/ua/analytics/`) are full-page loads built
  from `APP_IDENTITY`. `returnUrl` is same-origin only (`safeReturnUrl`).
- **GA4** loads only after consent. Events go through `Ga4Loader.event()`'s typed list and carry
  no personal data. CI fails if a prerendered page references Google Tag Manager.
- **Styling:** tokens only, light and dark. Lighthouse budgets are enforced in CI. Check contrast
  by hand for below-the-fold content (Lighthouse skips it).

## Process

Branch off **`develop`** (`feat/…`, `fix/…`, `docs/…`, `chore/…`). PRs target `develop`; `main` is
release. Conventional Commits with a scope. Before a PR, run what CI runs: format check, lint,
vocabulary check, build (prerender check), tests, Lighthouse. Check UI in light and dark, at
phone width, and in Ukrainian. Have the change reviewed by a separate agent or person.
