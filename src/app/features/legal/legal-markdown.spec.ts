import { fillPlaceholders, renderLegalMarkdown } from './legal-markdown';

describe('fillPlaceholders', () => {
  it('fills every known placeholder', () => {
    expect(fillPlaceholders('{{a}} and {{b}}', { a: 'one', b: 'two' })).toBe('one and two');
  });

  it('throws on an unknown placeholder instead of publishing braces', () => {
    expect(() => fillPlaceholders('Contact {{nope}}', {})).toThrowError(/\{\{nope\}\}/);
  });
});

describe('renderLegalMarkdown', () => {
  it('renders headings with derived and explicit anchors, and a table of contents', () => {
    const { html, toc } = renderLegalMarkdown(
      '## 1. What we collect\n\ntext\n\n## 6. Reporting abuse {#reporting}\n\n### Detail',
    );
    expect(html).toContain('<h2 id="what-we-collect">1. What we collect</h2>');
    expect(html).toContain('<h2 id="reporting">6. Reporting abuse</h2>');
    expect(html).toContain('<h3 id="detail">Detail</h3>');
    expect(toc).toEqual([
      { id: 'what-we-collect', text: '1. What we collect' },
      { id: 'reporting', text: '6. Reporting abuse' },
    ]);
  });

  it('keeps anchors unique', () => {
    const { toc } = renderLegalMarkdown('## Scope\n\n## Scope');
    expect(toc.map((h) => h.id)).toEqual(['scope', 'scope-2']);
  });

  it('renders lists, paragraphs with line breaks, and inline marks', () => {
    const { html } = renderLegalMarkdown(
      '- **bold** item\n- `kit_` key\n\n1. first\n2. second\n\nline one\nline two',
    );
    expect(html).toContain(
      '<ul><li><strong>bold</strong> item</li><li><code>kit_</code> key</li></ul>',
    );
    expect(html).toContain('<ol><li>first</li><li>second</li></ol>');
    expect(html).toContain('<p>line one<br>line two</p>');
  });

  it('does not mistake numbered clauses like "2.1" for list items', () => {
    const { html } = renderLegalMarkdown('2.1 You are the controller.');
    expect(html).toBe('<p>2.1 You are the controller.</p>');
  });

  it('renders tables and drops an all-empty header row', () => {
    const { html } = renderLegalMarkdown(
      '| A | B |\n|---|---|\n| 1 | 2 |\n\n| | |\n|---|---|\n| x | y |',
    );
    expect(html).toContain('<thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead>');
    expect(html).toContain('<tbody><tr><td>1</td><td>2</td></tr></tbody>');
    expect(html).toContain('<table><tbody><tr><td>x</td><td>y</td></tr></tbody></table>');
  });

  it('links site paths through resolvePath and auto-links email addresses', () => {
    const { html } = renderLegalMarkdown(
      'See [the DPA](/legal/dpa#transfers) or write to a@b.example.',
      {
        resolvePath: (p) => `/ua${p}`,
      },
    );
    expect(html).toContain('<a href="/ua/legal/dpa#transfers">the DPA</a>');
    expect(html).toContain('<a href="mailto:a@b.example">a@b.example</a>');
  });

  it('escapes HTML in the text', () => {
    const { html } = renderLegalMarkdown('<script>alert(1)</script> & "quotes"');
    expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;</p>');
  });

  it('rejects unsafe link targets', () => {
    expect(() => renderLegalMarkdown('[x](javascript:alert(1))')).toThrowError(/only \/paths/);
    expect(() => renderLegalMarkdown('[x](//evil.example)')).toThrowError(/only \/paths/);
    expect(() => renderLegalMarkdown('[x](http://insecure.example)')).toThrowError(/only \/paths/);
  });
});
