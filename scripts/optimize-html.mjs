// Post-build tweaks to every built HTML page, for first paint (plan §7 budgets).
// Each was measured with Lighthouse before it went in.
//
// 1. Preload the above-the-fold fonts AND inline their @font-face rules. Angular
//    inlines only the critical CSS and loads the full stylesheet async — and the
//    critical CSS carries no @font-face at all. So a preloaded font sat unused
//    until the full stylesheet arrived: first paint used a system font, then text
//    re-wrapped when the real face applied. English got away with it; on /ua/pricing
//    the h1 went from five lines to four (CLS 0.107). Preloading alone took FCP
//    2.71 s → 2.26 s on the home page; inlining the rules makes the preload usable.
//    File names carry a content hash known only after the build, hence post-build.
//    Keep the list short: every extra preload competes for bandwidth with the rest.
//
// 2. Load the Angular bundle at low fetch priority. Pages are fully prerendered,
//    so JS only hydrates (mobile menu, scroll reveal, client navigation) and
//    shouldn't compete with the HTML and fonts on a slow link. FCP 2.26 s → 1.36 s.
//
// 3. Don't request that bundle until the page has loaded and painted. Low priority
//    still started all ~160 kB of it alongside the HTML, and Lighthouse's simulated
//    slow 4G charges every request in flight before the first paint to LCP: the
//    hero text painted at ~70 ms in the trace but scored 2.56–2.86 s, all of it
//    "render delay". Now a tiny inline script adds the modulepreloads and module
//    scripts (in their original order) after `load` and the first contentful
//    paint. Clicks in between aren't lost: withEventReplay replays them once the
//    app hydrates.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'dist/kitlet-portal/browser';

// Faces that paint the first viewport, per language. Each language build has its
// own media/ and stylesheet (resolved against its <base href>). /ua/ sets headings
// in Plex Sans (Bricolage has no Cyrillic), so its heading face is Plex Cyrillic 600.
const FACES = {
  en: [
    /^bricolage-grotesque-latin-wght-normal-[\w-]+\.woff2$/, // headings, incl. every h1
    /^ibm-plex-sans-latin-400-normal-[\w-]+\.woff2$/, // body copy
    // Buttons (the hero CTAs). Without it, CI's Linux fallback font set the CTAs
    // wide enough to wrap to a second row, then Plex 600 arrived and the hero
    // mockup below jumped up twice: CLS 0.156 on / (not reproducible on Windows,
    // whose fallback happened to fit).
    /^ibm-plex-sans-latin-600-normal-[\w-]+\.woff2$/,
  ],
  uk: [
    /^ibm-plex-sans-cyrillic-600-normal-[\w-]+\.woff2$/, // headings
    /^ibm-plex-sans-cyrillic-400-normal-[\w-]+\.woff2$/, // body copy
    // Punctuation, digits and Latin words in body copy ("—", "10 000", "WordPress").
    /^ibm-plex-sans-latin-400-normal-[\w-]+\.woff2$/,
  ],
};

const headCache = new Map();
async function headFor(lang, root) {
  if (headCache.has(root)) return headCache.get(root);
  const faces = FACES[lang];
  if (!faces) throw new Error(`No preload faces configured for <html lang="${lang}">`);

  const media = await readdir(join(root, 'media'));
  const files = faces.map((pattern) => {
    const match = media.filter((f) => pattern.test(f));
    if (match.length !== 1) {
      throw new Error(`Expected one font matching ${pattern} in ${root}, found ${match.length}`);
    }
    return match[0];
  });

  const stylesheet = (await readdir(root)).find((f) => /^styles-[\w-]+\.css$/.test(f));
  if (!stylesheet) throw new Error(`No styles-*.css in ${root}`);
  const css = await readFile(join(root, stylesheet), 'utf8');
  const fontFaces = files.map((file) => {
    const rule = css.match(/@font-face\{[^}]*\}/g)?.find((r) => r.includes(file));
    if (!rule) throw new Error(`No @font-face rule for ${file} in ${stylesheet}`);
    return rule;
  });

  const head =
    files
      .map((f) => `<link rel="preload" href="media/${f}" as="font" type="font/woff2" crossorigin>`)
      .join('') + `<style data-kit-fonts>${fontFaces.join('')}</style>`;
  headCache.set(root, head);
  return head;
}

// Starts once the page has loaded (HTML, fonts and the full stylesheet are in) AND
// the browser has reported its first contentful paint, which on these pages is the
// hero text: the LCP. Without paint timing it starts straight after `load`; the 3 s
// timer covers a paint that's never reported (a tab opened in the background).
// async = false keeps the scripts executing in document order, polyfills before main.
function hydrateAfterPaint(preloads, scripts) {
  return `<script data-kit-hydrate>addEventListener('load',function(){var d=document,started=0;function go(){if(started++)return;${JSON.stringify(preloads)}.forEach(function(h){var l=d.createElement('link');l.rel='modulepreload';l.fetchPriority='low';l.href=h;d.head.appendChild(l)});${JSON.stringify(scripts)}.forEach(function(s){var e=d.createElement('script');e.type='module';e.async=false;e.fetchPriority='low';e.src=s;d.body.appendChild(e)})}var P=window.PerformanceObserver;if(!P||(P.supportedEntryTypes||[]).indexOf('paint')<0)return go();setTimeout(go,3000);new P(function(list){if(list.getEntriesByName('first-contentful-paint').length)setTimeout(go)}).observe({type:'paint',buffered:true})})</script>`;
}

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
  if (html.includes('data-kit-fonts')) continue; // already processed

  const base = html.match(/<base href="\/([^"]*)">/);
  const lang = html.match(/<html lang="([\w-]+)"/)?.[1];
  if (!base || !lang) {
    console.error(`${file}: no <base href> or <html lang> to work from.`);
    process.exit(1);
  }
  const head = await headFor(lang, join(OUT, base[1]));
  const at = base.index + base[0].length;
  html = html.slice(0, at) + head + html.slice(at);

  const preloads = [];
  const scripts = [];
  html = html
    .replace(/<link rel="modulepreload" href="([^"]+)">/g, (_, href) => {
      preloads.push(href);
      return '';
    })
    .replace(/<script src="([^"]+)" type="module"><\/script>/g, (_, src) => {
      scripts.push(src);
      return '';
    });
  if (!scripts.length || !html.includes('</body>')) {
    console.error(`${file}: no module scripts or </body> to defer.`);
    process.exit(1);
  }
  html = html.replace('</body>', `${hydrateAfterPaint(preloads, scripts)}</body>`);

  await writeFile(file, html);
  count++;
}
console.log(
  `optimize-html: font preloads + inline @font-face + JS after first paint on ${count} page(s)`,
);
