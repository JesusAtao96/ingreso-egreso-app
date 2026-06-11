import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { NavbarComponent } from './navbar.component';
import { ThemeService } from '../../../core/theme/theme.service';

/**
 * Unit tests for the NavbarComponent theme toggle.
 *
 * The component binds to `ThemeService.theme()` via a signal; the
 * icon shown reflects the *destination* theme (sun = go light,
 * moon = go dark). The rendered aria-label changes accordingly.
 */

const STORAGE_KEY = 'app:theme';

function matchMediaMock(prefersLight: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: light)' ? prefersLight : false,
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

describe('NavbarComponent — theme toggle', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    document.documentElement.removeAttribute('data-theme');
    matchMediaMock(false);
    TestBed.configureTestingModule({
      imports: [NavbarComponent],
    });
  });

  afterEach(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    document.documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
  });

  it('shows the sun icon in dark mode (clicking switches to light)', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '[data-testid="navbar-theme-toggle"]',
    );
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(button.querySelector('.material-symbols-outlined').textContent.trim()).toBe('light_mode');
  });

  it('flips the theme when the button is clicked', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="navbar-theme-toggle"]',
    );
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
