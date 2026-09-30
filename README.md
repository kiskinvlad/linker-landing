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
