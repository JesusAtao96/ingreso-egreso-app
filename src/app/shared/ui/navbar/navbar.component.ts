import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ThemeService } from '../../../core/theme/theme.service';

/**
 * Authenticated user shape as exposed to UI components.
 *
 * Kept narrow on purpose — components only see what they need.
 */
export interface NavbarUser {
  nombre: string;
  email?: string;
}

/**
 * Top navigation bar.
 *
 * - Renders the brand and the authenticated user's display name.
 * - Hosts the light/dark theme toggle. The toggle is an icon
 *   button bound to `ThemeService.theme()`; clicking it flips
 *   the theme. The icon shown reflects the theme the user would
 *   switch TO (sun in dark mode → click for light; moon in light
 *   mode → click for dark).
 * - Standalone, uses Tailwind utilities + the project's glass
 *   tokens.
 * - Signal inputs — the parent passes a `NavbarUser | null`. When
 *   the user is signed out the greeting disappears entirely.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly themeService = inject(ThemeService);

  readonly navbarUser = input<NavbarUser | null>(null);

  // The icon reflects the destination theme (sun = go light, moon = go dark).
  readonly themeIcon = computed(() =>
    this.themeService.theme() === 'dark' ? 'light_mode' : 'dark_mode',
  );
  readonly themeLabel = computed(() =>
    this.themeService.theme() === 'dark'
      ? 'Switch to light theme'
      : 'Switch to dark theme',
  );

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
