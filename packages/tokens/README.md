# @kiskinvlad/linker-tokens

Kitlet design tokens, shared by the Linker portal (this repo) and the editor
(`linker-editor`): brand colours, a semantic light/dark palette, and font stacks.
The source is `src/tokens.mjs`; `build.mjs` generates everything in `dist/`.

| File           | Use                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`   | Custom properties. Light on `:root`, dark under `prefers-color-scheme`, and `<html data-theme="light\|dark">` pins either.                                                  |
| `_tokens.scss` | Raw values (`$kit-light-accent`, `$kit-dark-surface`, …) and mixins `kit-palette-light` / `kit-palette-dark`, for code that needs literals, e.g. Angular Material palettes. |
| `tokens.json`  | The same data for scripts and docs.                                                                                                                                         |

Roles, not hues: style against `--surface`, `--ink-2`, `--accent-text`, and reach for
the brand colours (`--kit-blue`, `--spark`, `--night`) only when you mean the brand
itself. `--accent` is for fills and `--on-accent` for text on them; accent-coloured
_text_ is `--accent-text`, which is tuned for WCAG AA.

The package names the fonts but does not load them. Self-host them with
`@fontsource` (never Google's CDN — it sends visitor IPs to Google) and use the
per-weight files (`@fontsource/ibm-plex-sans/400.css`), which carry `unicode-range`.

## Installing (GitHub Packages)

Published to GitHub Packages, so installs need a token with `read:packages`.

```ini
# .npmrc in the consuming repo
@kiskinvlad:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

- Locally: a personal access token (classic) with `read:packages`, exported as
  `NODE_AUTH_TOKEN`.
- In another repo's GitHub Actions: `GITHUB_TOKEN` works once that repo is granted
  access under the package's _Manage Actions access_ settings; give the job
  `permissions: packages: read`.

```css
@import '@kiskinvlad/linker-tokens/tokens.css';
```

For SCSS, `_tokens.scss` is exported as `@kiskinvlad/linker-tokens/_tokens.scss`
and advertised under the `sass` field. The exact `@use` path depends on the
consumer's Sass resolver and hasn't been exercised yet — the editor is the first
SCSS consumer, so settle it (and document it here) when adopting it there.

The portal in this repo uses the package through the pnpm workspace
(`workspace:*`), so it needs no token.

## Releasing

1. Edit `src/tokens.mjs`, bump `version` in `package.json` (semver: renaming or
   removing a role is a major bump — both apps style against these names).
2. Merge, then tag the merge commit `tokens-v<version>` and push the tag. The
   _Publish tokens_ workflow builds and publishes it.
