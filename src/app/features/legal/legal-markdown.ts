/**
 * Turns the legal texts in `docs/` into HTML. A deliberately small Markdown subset,
 * so no parser dependency ships to visitors and every construct the documents may
 * use is listed here:
 *
 * - `## Heading` and `### Heading`, optionally ending in `{#anchor}`; without one,
 *   the anchor is derived from the text (a leading "1. " is dropped)
 * - paragraphs; a single line break inside one is kept as `<br>`
 * - `- item` and `1. item` lists (one line per item)
 * - pipe tables, first row as the header (an all-empty header row is dropped)
 * - inline: `**bold**`, `` `code` ``, `[text](url)` and bare email addresses
 *
 * Everything else is escaped as text. Links may only point at `/…` paths, `#…`,
 * `https:` or `mailto:`, so the output is safe to hand to `bypassSecurityTrustHtml`.
 */

export interface LegalHeading {
  id: string;
  text: string;
}

export interface RenderedLegalDoc {
  html: string;
  /** Level-2 headings, in order: the table of contents. */
  toc: LegalHeading[];
}

export interface RenderOptions {
  /** Maps a site path (`/legal/dpa#x`) to the href to render, e.g. to add `/ua`. */
  resolvePath?: (path: string) => string;
}

/**
 * Replaces `{{name}}` with `vars[name]`. An unknown name throws, which fails the
 * prerender: a typo must never reach a published contract as literal braces.
 */
export function fillPlaceholders(text: string, vars: Readonly<Record<string, string>>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = vars[name];
    if (value === undefined) {
      throw new Error(`Legal text uses {{${name}}}, which has no value`);
    }
    return value;
  });
}

export function renderLegalMarkdown(md: string, options: RenderOptions = {}): RenderedLegalDoc {
  const resolvePath = options.resolvePath ?? ((p: string) => p);
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  const toc: LegalHeading[] = [];
  const usedIds = new Set<string>();
  const inline = (text: string) => renderInline(text, resolvePath);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = /^(#{2,3})\s+(.+?)(?:\s+\{#([a-z0-9-]+)\})?\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const id = uniqueId(heading[3] ?? slugify(text), usedIds);
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      if (level === 2) toc.push({ id, text: stripInline(text) });
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        // The `|---|---|` separator; the `-` keeps an all-empty `| | |` header row.
        const separator = /^\|[\s|:-]+\|?\s*$/.test(lines[i]) && lines[i].includes('-');
        if (!separator) rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(renderTable(rows, inline));
      continue;
    }

    const listKind = listItemKind(line);
    if (listKind) {
      const items: string[] = [];
      while (i < lines.length && listItemKind(lines[i]) === listKind) {
        items.push(lines[i].replace(/^(?:-|\d+\.)\s+/, ''));
        i++;
      }
      const tag = listKind === 'ol' ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{2,3}\s/.test(lines[i]) &&
      !lines[i].startsWith('|') &&
      !listItemKind(lines[i])
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
  }

  return { html: out.join('\n'), toc };
}

function listItemKind(line: string): 'ul' | 'ol' | null {
  if (/^-\s+/.test(line)) return 'ul';
  if (/^\d+\.\s+/.test(line)) return 'ol';
  return null;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(rows: string[][], inline: (s: string) => string): string {
  const [head, ...body] = rows;
  const headHtml = head.some((cell) => cell)
    ? `<thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead>`
    : '';
  const bodyRows = headHtml ? body : rows.slice(1);
  const bodyHtml = bodyRows
    .map((row) => `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
    .join('');
  // The wrapper scrolls sideways on narrow screens instead of the whole page.
  return `<div class="legal-table"><table>${headHtml}<tbody>${bodyHtml}</tbody></table></div>`;
}

const INLINE =
  /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

function renderInline(text: string, resolvePath: (p: string) => string): string {
  let html = '';
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    html += escapeHtml(text.slice(last, m.index));
    const [whole, code, linkText, url, bold, email] = m;
    if (code !== undefined) {
      html += `<code>${escapeHtml(code)}</code>`;
    } else if (linkText !== undefined) {
      html += `<a href="${escapeHtml(safeHref(url, resolvePath))}">${renderInline(linkText, resolvePath)}</a>`;
    } else if (bold !== undefined) {
      html += `<strong>${renderInline(bold, resolvePath)}</strong>`;
    } else if (email !== undefined) {
      html += `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`;
    } else {
      html += escapeHtml(whole);
    }
    last = m.index + whole.length;
  }
  return html + escapeHtml(text.slice(last));
}

function safeHref(url: string, resolvePath: (p: string) => string): string {
  if (url.startsWith('/') && !url.startsWith('//')) return resolvePath(url);
  if (url.startsWith('#') || url.startsWith('https://') || url.startsWith('mailto:')) return url;
  throw new Error(
    `Legal text links to "${url}"; only /paths, #anchors, https: and mailto: are allowed`,
  );
}

/** Heading text without Markdown marks, for the table of contents. */
function stripInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

function slugify(text: string): string {
  return (
    stripInline(text)
      .replace(/^\d+\.\s+/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

function uniqueId(id: string, used: Set<string>): string {
  let candidate = id;
  for (let n = 2; used.has(candidate); n++) candidate = `${id}-${n}`;
  used.add(candidate);
  return candidate;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
