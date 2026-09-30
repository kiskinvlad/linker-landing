/**
 * Kitlet design tokens: the one place brand and palette values are written down.
 * `build.mjs` turns this into tokens.css, _tokens.scss and tokens.json.
 *
 * Two layers:
 *   - brand: fixed brand colours, identical in light and dark;
 *   - palette: semantic roles (what a colour is FOR), with a light and a dark value.
 * Apps style against palette roles, and reach for brand only when they mean the
 * brand itself (a logo, the spark diamond, a navy band).
 *
 * Names follow the editor's existing roles (surface, border, ink-*), so adopting
 * the package there is a value change, not a rename. The one exception is the
 * editor's `--accent-ink`, which meant "accent used as text" there and "text on
 * an accent fill" in the portal. It is split into `accent-text` and `on-accent`
 * so neither app can read the other's meaning into it.
 */

export const brand = {
  'kit-blue': '#2f6feb',
  spark: '#ff6b35',
  night: '#141b2d',
};

/** Semantic palette. Every role must have both a light and a dark value. */
export const palette = {
  light: {
    // Grounds
    bg: '#ffffff', // page
    'bg-2': '#f5f7fb', // alternate section / app ground
    surface: '#ffffff', // cards, panels
    'surface-2': '#ffffff', // raised above a surface
    border: '#e3e7ef',
    'border-strong': '#cfd5e1',

    // Text
    ink: '#141b2d',
    'ink-2': '#414b63',
    'ink-3': '#6b7489',

    // Accent (kit-blue)
    accent: '#2f6feb', // fills: primary buttons, active states
    'on-accent': '#ffffff', // text/icons on an accent fill
    // kit-blue as text is 4.57:1 on white but under 4.5:1 on tinted panels.
    'accent-text': '#1f5ad4',
    'accent-soft': '#e8f0fe', // tinted background
    'accent-line': '#c6d9fb', // tinted border

    // Spark (orange)
    'spark-text': '#b83a0b', // spark as text: #ff6b35 is 2.8:1 on white
    'spark-soft': '#fff0e9',

    // Status
    success: '#1a9f5b',
    'success-soft': '#e5f5ee',
    warning: '#c08416',
    danger: '#b03a2e',
    'danger-soft': '#fdeeee',

    // Elevation
    'shadow-sm': '0 1px 2px rgb(20 27 45 / 0.06), 0 1px 1px rgb(20 27 45 / 0.04)',
    'shadow-md': '0 10px 30px -12px rgb(20 27 45 / 0.22), 0 2px 6px rgb(20 27 45 / 0.06)',
    'shadow-lg': '0 30px 60px -20px rgb(20 27 45 / 0.35), 0 8px 20px rgb(20 27 45 / 0.08)',
  },
  dark: {
    bg: '#0d1220',
    'bg-2': '#121a2c',
    surface: '#161f33',
    'surface-2': '#1c2740',
    border: '#243049',
    'border-strong': '#33415e',

    ink: '#eef2fa',
    'ink-2': '#b9c2d6',
    'ink-3': '#8a94ab',

    accent: '#5b8ef5',
    'on-accent': '#0d1220',
    // --accent is 4.2:1 on the tinted badge background; this is ~5.4:1.
    'accent-text': '#7aa4f7',
    'accent-soft': 'rgb(91 142 245 / 0.14)',
    'accent-line': '#2a3e63',

    'spark-text': '#ff6b35',
    'spark-soft': 'rgb(255 107 53 / 0.14)',

    success: '#3ccf85',
    'success-soft': '#12271f',
    warning: '#e0a83c',
    danger: '#e06c6c',
    'danger-soft': '#2a1717',

    // A dark panel can't be lifted off a dark ground by a light shadow, so these
    // are deeper and more opaque rather than a tint of the light set.
    'shadow-sm': '0 1px 2px rgb(0 0 0 / 0.35)',
    'shadow-md': '0 10px 30px -12px rgb(0 0 0 / 0.6), 0 2px 6px rgb(0 0 0 / 0.3)',
    'shadow-lg': '0 30px 60px -20px rgb(0 0 0 / 0.7), 0 8px 20px rgb(0 0 0 / 0.35)',
  },
};

/**
 * Font stacks. The package names the faces; loading them (self-hosted through
 * @fontsource, never Google's CDN) stays with each app, which knows which weights
 * and subsets it needs.
 */
export const fonts = {
  'font-display': "'Bricolage Grotesque Variable', 'IBM Plex Sans', system-ui, sans-serif",
  'font-sans': "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  'font-mono': "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Consolas, Menlo, monospace",
};
