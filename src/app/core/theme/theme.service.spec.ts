import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

const STORAGE_KEY = 'app:theme';

/**
 * Unit tests for the ThemeService.
 *
 * Scenarios:
 *   - defaults to dark when no preference is available
 *   - reads stored value from localStorage
 *   - toggles between light and dark
 *   - writes to localStorage and to <html data-theme> on change
 *   - respects prefers-color-scheme when no stored value
 */

// jsdom doesn't ship localStorage; the spec installs a polyfill so
// we can assert against it.
function installLocalStorageShim(): void {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal('localStorage', shim);
}

function matchMediaMock(prefersLight: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        query === '(prefers-color-scheme: light)' ? prefersLight : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

function setup(opts: { stored?: 'light' | 'dark'; prefersLight?: boolean } = {}): ThemeService {
  installLocalStorageShim();
  matchMediaMock(opts.prefersLight ?? false);
  if (opts.stored) {
    localStorage.setItem(STORAGE_KEY, opts.stored);
  }
  document.documentElement.removeAttribute('data-theme');
  const svc = TestBed.runInInjectionContext(() => new ThemeService());
  // Flush the initial effect that writes data-theme to <html>.
  TestBed.tick();
  return svc;
}

describe('ThemeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to dark when no stored value and OS prefers dark', () => {
    const svc = setup();
    expect(svc.theme()).toBe('dark');
  });

  it('respects prefers-color-scheme: light when no stored value', () => {
    const svc = setup({ prefersLight: true });
    expect(svc.theme()).toBe('light');
  });

  it('reads stored value from localStorage', () => {
    const svc = setup({ stored: 'light' });
    expect(svc.theme()).toBe('light');
  });

  it('toggles between dark and light', () => {
    const svc = setup();
    expect(svc.theme()).toBe('dark');
    svc.toggle();
    TestBed.tick();
    expect(svc.theme()).toBe('light');
    svc.toggle();
    TestBed.tick();
    expect(svc.theme()).toBe('dark');
  });

  it('writes to localStorage when toggled', () => {
    const svc = setup();
    svc.toggle();
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    svc.toggle();
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('applies data-theme attribute on <html>', () => {
    const svc = setup();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    svc.toggle();
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
