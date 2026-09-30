// Post-build tweaks to every built HTML page, for first paint (plan §7 budgets).
// Each was measured with Lighthouse on the home page before it went in.
//
// 1. Preload the two above-the-fold fonts. They come from @fontsource CSS imports,
//    so their names carry a content hash known only after the build; and without
//    a preload they're discovered late, because Angular inlines the critical CSS
//    and loads the full stylesheet (with the @font-face rules) async.
//    FCP 2.71 s → 2.26 s. Only these two faces: every extra preload competes for
//    bandwidth with the ones that matter.
//
// 2. Load the Angular bundle at low fetch priority. Pages are fully prerendered,
//    so JS only hydrates (mobile menu, scroll reveal, client navigation) and
//    shouldn't compete with the HTML and fonts on a slow link. FCP 2.26 s → 1.36 s.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'dist/kitlet-portal/browser';
const BASE = '<base href="/">';
const FACES = [
  /^bricolage-grotesque-latin-wght-normal-[\w-]+\.woff2$/, // headings, incl. every h1
  /^ibm-plex-sans-latin-400-normal-[\w-]+\.woff2$/, // body copy
];

const media = await readdir(join(OUT, 'media'));
const fonts = FACES.map((pattern) => {
  const match = media.filter((f) => pattern.test(f));
  if (match.length !== 1) {
    console.error(`Expected one font matching ${pattern}, found ${match.length}.`);
    process.exit(1);
  }
  return match[0];
});
const preloads = fonts
  .map((f) => `<link rel="preload" href="media/${f}" as="font" type="font/woff2" crossorigin>`)
  .join('');

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'media') yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

let count = 0;
for await (const file of htmlFiles(OUT)) {
  let html = await readFile(file, 'utf8');
  if (html.includes('rel="preload" href="media/')) continue; // already processed

  const at = html.indexOf(BASE);
  if (at === -1) {
    console.error(`No ${BASE} in ${file} to anchor the preloads after.`);
    process.exit(1);
  }
  html = html.slice(0, at + BASE.length) + preloads + html.slice(at + BASE.length);

  html = html
    .replace(
      /<script src="([^"]+)" type="module">/g,
      '<script src="$1" type="module" fetchpriority="low">',
    )
    .replace(
      /<link rel="modulepreload" href="([^"]+)">/g,
      '<link rel="modulepreload" href="$1" fetchpriority="low">',
    );

  await writeFile(file, html);
  count++;
}
console.log(`optimize-html: preloaded ${fonts.join(', ')}; ${count} page(s)`);
