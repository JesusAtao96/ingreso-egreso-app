import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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
 * - Standalone, uses Bootstrap 5 utility classes (`float-end`,
 *   `fw-bold`, `data-bs-toggle`, etc.).
 * - Signal inputs — the parent passes a `NavbarUser | null`. When the
 *   user is signed out the greeting disappears entirely.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  navbarUser = input<NavbarUser | null>(null);
}
