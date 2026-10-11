import { isAppUrl, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it.each([
    ['/pricing', '/pricing'],
    ['/editor/', '/editor/'],
    ['/account/profile?tab=1#x', '/account/profile?tab=1#x'],
  ])('keeps same-origin path %s', (raw, expected) => {
    expect(safeReturnUrl(raw)).toBe(expected);
  });

  it.each([
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example/',
    'javascript:alert(1)',
    'evil.example',
    '/\u0000/x',
    '/pricing\n',
    '',
  ])('refuses %j (open redirect)', (raw) => {
    expect(safeReturnUrl(raw)).toBe('/');
  });

  it('uses the given fallback', () => {
    expect(safeReturnUrl(null, '/login')).toBe('/login');
  });
});

describe('isAppUrl', () => {
  const apps = ['/editor/', '/analytics/'];

  it('recognises the other apps, with or without the trailing slash', () => {
    expect(isAppUrl('/editor/', apps)).toBe(true);
    expect(isAppUrl('/editor', apps)).toBe(true);
    expect(isAppUrl('/editor/widgets/1', apps)).toBe(true);
    expect(isAppUrl('/analytics/', apps)).toBe(true);
    expect(isAppUrl('/analytics', apps)).toBe(true);
    expect(isAppUrl('/analytics/widgets/w1?range=30d', apps)).toBe(true);
  });

  it('leaves portal pages to the router', () => {
    expect(isAppUrl('/editorial', apps)).toBe(false);
    expect(isAppUrl('/analytics-guide', apps)).toBe(false);
    expect(isAppUrl('/pricing', apps)).toBe(false);
  });
});
