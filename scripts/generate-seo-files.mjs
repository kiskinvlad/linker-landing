// Writes sitemap.xml and robots.txt into the static build (plan §7), after `ng build`.
//
// The URL list is read back from the prerendered pages themselves: every indexable
// page carries a <link rel="canonical">, and SeoService omits it on `noindex`
// pages. So the sitemap can't drift from the route table, and the domain comes
// from APP_IDENTITY alone rather than a second copy of it here.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'dist/kitlet-portal/browser';

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name === 'index.html') yield path;
  }
}

const canonicals = new Set();
for await (const file of htmlFiles(OUT)) {
  const html = await readFile(file, 'utf8');
  const href = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (href) canonicals.add(href);
}

if (canonicals.size === 0) {
  console.error(`No canonical URLs found under ${OUT}. Run the build first.`);
  process.exit(1);
}

const urls = [...canonicals].sort((a, b) => a.localeCompare(b));
const origin = new URL(urls[0]).origin;
const today = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;

// Private pages exist in every language build. Keep in sync with
// src/app/core/i18n/locales.ts (prefixes).
const LANGUAGE_PREFIXES = ['', '/ua'];
const PRIVATE = [
  '/account',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

const robots = `User-agent: *
Disallow: /editor/
${LANGUAGE_PREFIXES.flatMap((prefix) => PRIVATE.map((p) => `Disallow: ${prefix}${p}`)).join('\n')}

Sitemap: ${origin}/sitemap.xml
`;

await writeFile(join(OUT, 'sitemap.xml'), sitemap);
await writeFile(join(OUT, 'robots.txt'), robots);
console.log(`sitemap.xml: ${urls.length} URLs on ${origin}`);
