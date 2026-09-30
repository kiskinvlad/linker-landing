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
```

CI (`.github/workflows/ci.yml`) runs format check, lint, build and tests on every
PR to `develop`/`main`, and fails if a marketing page stops being prerendered.
It then runs `pnpm lighthouse` (Lighthouse CI against the static build) with the
plan §7 budgets from `lighthouserc.json`; reports are attached to the run as the
`lighthouse-reports` artifact.

One blind spot: sections below the fold start at `opacity: 0` until scrolled
into view (`RevealDirective`), and Lighthouse never scrolls, so its colour-contrast
audit skips them. Check contrast on new below-the-fold content by hand.

`pnpm build` also runs `scripts/optimize-html.mjs` (font preloads, low-priority
JS). Each change there was measured with Lighthouse; the numbers are in its header.

`pnpm build` also writes `sitemap.xml` and `robots.txt`
(`scripts/generate-seo-files.mjs`), built from the canonical URL of each
prerendered page, so `noindex` pages are left out automatically.

The domain comes from `APP_IDENTITY` (`src/app/core/config/app-identity.ts`) and is
the `linker.com` placeholder until the Kitlet domain is registered (plan milestone M8).
