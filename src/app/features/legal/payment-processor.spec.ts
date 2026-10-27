import { renderLegalMarkdown } from './legal-markdown';
import { LEGAL_DOCS } from './legal.content';
import { PAYMENT_PROCESSOR_LISTED, withPaymentProcessor } from './payment-processor';

const source = (slug: 'subprocessors' | 'privacy') =>
  import(`./docs/${slug}.md`).then((m: { default: string }) => m.default);

describe('the payment processor switch', () => {
  it('is off until the notice date: paid plans are not available yet', async () => {
    expect(PAYMENT_PROCESSOR_LISTED).toBe(false);
    const subprocessors = await LEGAL_DOCS.find((d) => d.slug === 'subprocessors')!.load();
    const privacy = await LEGAL_DOCS.find((d) => d.slug === 'privacy')!.load();

    expect(subprocessors).toContain('Paid plans are not available yet');
    expect(subprocessors).not.toContain('Stripe');
    expect(privacy).toContain('(when paid plans are available)');
  });

  it('names Stripe on the Subprocessors page once listed', async () => {
    const markdown = withPaymentProcessor('subprocessors', await source('subprocessors'), true);
    const { html } = renderLegalMarkdown(markdown);

    expect(markdown).not.toContain('Paid plans are not available yet');
    expect(html).toContain('<strong>Stripe</strong>');
    expect(html).toContain('never reach us');
  });

  it('drops the Privacy Policy’s condition on billing data once listed', async () => {
    const markdown = withPaymentProcessor('privacy', await source('privacy'), true);

    expect(markdown).not.toContain('(when paid plans are available)');
    expect(markdown).toContain('**Billing data** — plan, invoices');
  });

  it('fails loudly if the text it switches has moved', () => {
    expect(() => withPaymentProcessor('subprocessors', 'reworded', true)).toThrow(/missing/);
  });
});
