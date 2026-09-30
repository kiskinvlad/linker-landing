// Renders the Open Graph share images (1200×630 PNG) into public/og/ with
// headless Chrome. Run by hand when page titles or the brand change, and commit
// the PNGs: they're static assets, and CI shouldn't need a browser to build.
//
//   node scripts/render-og-images.mjs            (Chrome found automatically)
//   CHROME_PATH=/path/to/chrome node scripts/render-og-images.mjs
//
// Social platforms don't render SVG previews, hence PNG. Fonts come from the same
// @fontsource packages the site self-hosts, loaded from node_modules by file URL.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Keep `slug` in sync with RouteSeo.ogImage in the route configs, and the
// languages with src/app/core/i18n/locales.ts. Files are <slug>.<locale>.png.
const PAGES = {
  en: [
    {
      slug: 'home',
      eyebrow: 'On-brand offers for any store',
      title: 'Turn more of your visitors into <em>buyers.</em>',
      lead: 'Offers, signup forms and promo banners. Design visually, publish with a click.',
    },
    {
      slug: 'pricing',
      eyebrow: 'Pricing',
      title: 'Start free. Upgrade when it <em>pays for itself.</em>',
      lead: '1 live widget and 10,000 views a month on the Free plan. No credit card.',
    },
    {
      slug: 'how-it-works',
      eyebrow: 'How it works',
      title: 'From sign-up to a live offer in <em>six steps.</em>',
      lead: 'No developer, no theme edits. Paste one snippet, once.',
    },
  ],
  uk: [
    {
      slug: 'home',
      eyebrow: 'Фірмові пропозиції для будь-якого магазину',
      title: 'Перетворюйте більше відвідувачів на <em>покупців.</em>',
      lead: 'Пропозиції, форми підписки та промобанери. Візуальний редактор, публікація одним кліком.',
    },
    {
      slug: 'pricing',
      eyebrow: 'Тарифи',
      title: 'Почніть безкоштовно. Платіть, <em>коли окупиться.</em>',
      lead: '1 активний віджет і 10 000 переглядів на місяць безкоштовно. Без картки.',
    },
    {
      slug: 'how-it-works',
      eyebrow: 'Як це працює',
      title: 'Від реєстрації до живої пропозиції <em>за шість кроків.</em>',
      lead: 'Без розробника й без правок теми. Один раз вставте фрагмент коду.',
    },
  ],
};

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('No Chrome found. Set CHROME_PATH.');
  process.exit(1);
}

const fontUrl = async (pkg, pattern) => {
  const dir = resolve('node_modules', pkg, 'files');
  const file = (await readdir(dir)).find((f) => pattern.test(f));
  if (!file) throw new Error(`No font matching ${pattern} in ${dir}`);
  return pathToFileURL(join(dir, file)).href;
};

const fonts = {
  display: await fontUrl(
    '@fontsource-variable/bricolage-grotesque',
    /^bricolage-grotesque-latin-wght-normal\.woff2$/,
  ),
  sans: await fontUrl('@fontsource/ibm-plex-sans', /^ibm-plex-sans-latin-400-normal\.woff2$/),
  mono: await fontUrl('@fontsource/ibm-plex-mono', /^ibm-plex-mono-latin-400-normal\.woff2$/),
  // Bricolage has no Cyrillic: Ukrainian headings fall back to Plex Sans 600, as on the site.
  sansCyr: await fontUrl('@fontsource/ibm-plex-sans', /^ibm-plex-sans-cyrillic-400-normal\.woff2$/),
  headingCyr: await fontUrl(
    '@fontsource/ibm-plex-sans',
    /^ibm-plex-sans-cyrillic-600-normal\.woff2$/,
  ),
  monoCyr: await fontUrl('@fontsource/ibm-plex-mono', /^ibm-plex-mono-cyrillic-400-normal\.woff2$/),
};

// The inverse logo: white strokes for the navy background.
const logo = (await readFile('brand/logos/kitlet-logo-inverse.svg', 'utf8')).replace(
  /width="316" height="68"/,
  'width="190" height="41"',
);

const CYRILLIC = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';

const page = ({ eyebrow, title, lead }, lang) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
  @font-face { font-family: Display; src: url(${fonts.display}) format('woff2'); font-weight: 100 900; }
  @font-face { font-family: Sans; src: url(${fonts.sans}) format('woff2'); }
  @font-face { font-family: Mono; src: url(${fonts.mono}) format('woff2'); }
  @font-face { font-family: Sans; src: url(${fonts.sansCyr}) format('woff2'); unicode-range: ${CYRILLIC}; }
  @font-face { font-family: Mono; src: url(${fonts.monoCyr}) format('woff2'); unicode-range: ${CYRILLIC}; }
  @font-face { font-family: HeadingCyr; src: url(${fonts.headingCyr}) format('woff2'); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    padding: 72px 80px;
    display: flex; flex-direction: column;
    color: #d5dbea; font-family: Sans, sans-serif;
    background:
      radial-gradient(520px 380px at 100% 0%, rgb(255 107 53 / 0.32), transparent 70%),
      radial-gradient(560px 420px at 0% 100%, rgb(47 111 235 / 0.35), transparent 70%),
      radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.09) 1px, transparent 0) 0 0 / 24px 24px,
      #141b2d;
  }
  .eyebrow {
    display: flex; align-items: center; gap: 12px;
    margin-top: auto;
    font: 400 22px Mono, monospace; letter-spacing: 0.06em; text-transform: uppercase;
    color: #ff6b35;
  }
  .eyebrow::before { content: ''; width: 12px; height: 12px; background: #ff6b35; transform: rotate(45deg); }
  h1 {
    max-width: 900px; margin-top: 20px;
    font: 750 72px/1.05 Display, HeadingCyr, sans-serif; letter-spacing: -0.025em; color: #fff;
  }
  h1 em { font-style: normal; color: #7aa4f7; }
  p { max-width: 820px; margin-top: 24px; font-size: 28px; line-height: 1.4; }
</style></head><body>
  ${logo}
  <p class="eyebrow">${eyebrow}</p>
  <h1>${title}</h1>
  <p>${lead}</p>
</body></html>`;

const outDir = resolve('public/og');
await mkdir(outDir, { recursive: true });
const tmp = await mkdtemp(join(tmpdir(), 'kit-og-'));

try {
  for (const [lang, pages] of Object.entries(PAGES))
    for (const p of pages) {
      const name = `${p.slug}.${lang}`;
      const html = join(tmp, `${name}.html`);
      const png = join(outDir, `${name}.png`);
      await writeFile(html, page(p, lang));
      execFileSync(
        chrome,
        [
          '--headless=new',
          '--disable-gpu',
          '--hide-scrollbars',
          '--force-device-scale-factor=1',
          '--window-size=1200,630',
          // Fonts load from file URLs; give them time before the capture.
          '--virtual-time-budget=3000',
          `--screenshot=${png}`,
          pathToFileURL(html).href,
        ],
        { stdio: 'ignore' },
      );
      console.log(`og: public/og/${name}.png`);
    }
} finally {
  await rm(tmp, { recursive: true, force: true });
}
