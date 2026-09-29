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

`pnpm build` also writes `sitemap.xml` and `robots.txt`
(`scripts/generate-seo-files.mjs`), built from the canonical URL of each
prerendered page, so `noindex` pages are left out automatically.

The domain comes from `APP_IDENTITY` (`src/app/core/config/app-identity.ts`) and is
the `linker.com` placeholder until the Kitlet domain is registered (plan milestone M8).
