import { featureName } from './feature-names';

describe('featureName', () => {
  it('names the AI assistant', () => {
    expect(featureName('ai_assistant')).toBe('AI assistant');
  });

  it('names the other known features', () => {
    expect(featureName('analytics')).toBe('Analytics');
    expect(featureName('custom_branding')).toBe('Custom branding');
  });

  it('reads an unknown key rather than hiding it', () => {
    expect(featureName('brand_new_thing')).toBe('Brand new thing');
  });
});
