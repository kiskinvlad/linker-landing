import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ANALYTICS_PATHS, APP_IDENTITY } from './app-identity';

describe('APP_IDENTITY', () => {
  it.each([
    ['en', '/analytics/'],
    ['uk', '/ua/analytics/'],
  ])('links the %s pages to analytics in the same language', (locale, path) => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }] });
    expect(TestBed.inject(APP_IDENTITY).analyticsPath).toBe(path);
  });

  it('knows every language’s analytics path, for returnUrl', () => {
    expect(ANALYTICS_PATHS).toEqual(['/analytics/', '/ua/analytics/']);
  });
});
