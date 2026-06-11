import { DOCUMENT, Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'app:theme';

/**
 * Application theme — light or dark — backed by a signal so any
 * component can reactively bind to it (header toggle, charts
 * palette, etc.).
 *
 * Persistence rules:
 *
 * - On first load, if `localStorage` has no entry, the OS
 *   preference (`prefers-color-scheme`) wins. No entry is written
 *   yet so we can re-detect the OS pref on every fresh visit.
 * - Once the user explicitly toggles, the choice is written to
 *   `localStorage` and read on every subsequent visit. The OS pref
 *   is then ignored.
 *
 * The signal writes to `document.documentElement.dataset.theme` so
 * the CSS at `html[data-theme="light"]` in `styles.css` swaps the
 * design tokens (surface, ink, glass tints, accent hover).
 *
 * The service is `providedIn: 'root'` so it's a singleton. It is
 * safe to inject in the navbar without any further wiring.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>(this.detectInitialTheme());

  constructor() {
    effect(() => {
      const value = this.theme();
      if (!this.isBrowser) return;
      this.document.documentElement.setAttribute('data-theme', value);
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // localStorage may be unavailable (private mode, quota);
        // theme still works in-memory.
      }
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this.theme.set(theme);
  }

  private detectInitialTheme(): Theme {
    if (!this.isBrowser) return 'dark';
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    const prefersLight =
      window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
    return prefersLight ? 'light' : 'dark';
  }
}
