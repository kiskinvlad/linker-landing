import { TestBed } from '@angular/core/testing';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { legalPlaceholders } from './legal-doc.resolver';
import { fillPlaceholders, renderLegalMarkdown, RenderedLegalDoc } from './legal-markdown';
import { LEGAL_DOCS, LEGAL_TERMS_VERSION, LegalSlug } from './legal.content';

/** A document as the resolver renders it, placeholders filled. */
async function render(slug: LegalSlug): Promise<RenderedLegalDoc> {
  const doc = LEGAL_DOCS.find((d) => d.slug === slug)!;
  const placeholders = legalPlaceholders(TestBed.inject(APP_IDENTITY));
  return renderLegalMarkdown(fillPlaceholders(await doc.load(), placeholders));
}

const version = (slug: LegalSlug) => LEGAL_DOCS.find((d) => d.slug === slug)!.version;

describe('legal documents', () => {
  it('render every document with all placeholders known', async () => {
    for (const doc of LEGAL_DOCS) {
      await expect(render(doc.slug), doc.slug).resolves.toBeTruthy();
    }
  });

  it('name the getkitlet.com contacts and no placeholder domain', async () => {
    const docs = await Promise.all(LEGAL_DOCS.map((d) => render(d.slug)));
    const html = docs.map((d) => d.html).join('\n');
    for (const contact of ['legal', 'privacy', 'abuse', 'copyright', 'security']) {
      expect(html, contact).toContain(`${contact}@getkitlet.com`);
    }
    expect(html).toContain('https://getkitlet.com');
    expect(html).not.toMatch(/kitlet\.example|linker\.com/);
  });

  describe('AI features (ai-assistant, AI-0)', () => {
    it('the Terms have an AI features section on credits and responsibility', async () => {
      const { html, toc } = await render('terms');
      expect(toc.map((h) => h.text)).toContain('6A. AI features');
      expect(html).toContain('no cash value');
      expect(html).toContain('do not roll over');
      expect(html).toMatch(/AI Output[^<]*is a suggestion/);
    });

    it('the Acceptable Use Policy covers misusing AI features', async () => {
      const { html } = await render('acceptable-use');
      expect(html).toContain('AI features');
      expect(html).toMatch(/bypass[^<]*safeguards/);
    });

    it('the Privacy Policy covers AI requests, their retention and Amazon Bedrock', async () => {
      const { html } = await render('privacy');
      expect(html).toContain('AI requests');
      expect(html).toContain('Amazon Bedrock');
      // The retention table's row for AI requests says 30 days.
      expect(html).toMatch(/AI requests(?:(?!<\/tr>).)*30 days/s);
      expect(html).toContain('not used to train');
    });

    it('the Subprocessors list AI features under AWS', async () => {
      const { html } = await render('subprocessors');
      expect(html).toContain('AI features (Amazon Bedrock)');
    });

    it('each changed document carries the new version', () => {
      for (const slug of ['terms', 'privacy', 'acceptable-use', 'subprocessors'] as const) {
        expect(version(slug), slug).toBe('2026-10-25');
      }
      expect(LEGAL_TERMS_VERSION).toBe('2026-10-25');
    });
  });
});
