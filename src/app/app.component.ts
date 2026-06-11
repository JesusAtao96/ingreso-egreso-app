import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthStore } from './features/auth/application/auth.store';
import { SplashComponent } from './shared/ui/splash/splash.component';

/**
 * Application shell.
 *
 * Renders a global splash overlay while the auth store hasn't
 * yet read the Firebase session (`hydrated() === false`). This
 * covers the F5 / hard-refresh case: the user lands on the app,
 * the store is still empty, and without the splash the guard
 * would briefly route them to /auth/login before Firebase
 * answered. With the splash in place, they see a calm loading
 * card until we know enough to route.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SplashComponent],
  template: `
    @if (showSplash()) {
      <app-splash />
    } @else {
      <div class="min-h-screen">
        <router-outlet />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly authStore = inject(AuthStore);

  readonly showSplash = computed(() => !this.authStore.hydrated());
}
