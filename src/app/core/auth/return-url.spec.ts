import { isEditorUrl, safeReturnUrl } from './return-url';

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

describe('isEditorUrl', () => {
  it('recognises the editor app, with or without the trailing slash', () => {
    expect(isEditorUrl('/editor/', '/editor/')).toBe(true);
    expect(isEditorUrl('/editor', '/editor/')).toBe(true);
    expect(isEditorUrl('/editor/widgets/1', '/editor/')).toBe(true);
    expect(isEditorUrl('/editorial', '/editor/')).toBe(false);
    expect(isEditorUrl('/pricing', '/editor/')).toBe(false);
  });
});
