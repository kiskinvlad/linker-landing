import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PADDLE_JS_URL, PADDLE_LOADER, PaddleJs } from './paddle-loader';

function setup() {
  const appended: HTMLScriptElement[] = [];
  const window: { Paddle?: PaddleJs } = {};
  const document = {
    defaultView: window,
    createElement: () => ({}) as HTMLScriptElement,
    head: { appendChild: (script: HTMLScriptElement) => appended.push(script) },
  };
  TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: document }] });
  return { load: TestBed.inject(PADDLE_LOADER), appended, window };
}

describe('PADDLE_LOADER', () => {
  it('injects Paddle.js once and resolves with it when it loads', async () => {
    const { load, appended, window } = setup();

    const first = load();
    const second = load();
    expect(appended).toHaveLength(1);
    expect(appended[0]?.src).toBe(PADDLE_JS_URL);

    window.Paddle = { Environment: { set: vi.fn() }, Initialize: vi.fn() };
    appended[0]?.onload?.(new Event('load'));

    await expect(first).resolves.toBe(window.Paddle);
    await expect(second).resolves.toBe(window.Paddle);
  });

  it('rejects when the script cannot be fetched, and tries again next time', async () => {
    const { load, appended } = setup();

    const first = load();
    appended[0]?.onerror?.(new Event('error'));
    await expect(first).rejects.toThrow(/could not be fetched/);

    void load();
    expect(appended).toHaveLength(2);
  });
});
