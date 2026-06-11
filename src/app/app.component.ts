import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthStore } from './features/auth/application/auth.store';
import { SplashComponent } from './shared/ui/splash/splash.component';

/**
 * Application shell.
 *
 * Two responsibilities, in order of importance:
 *
 * 1. **Splash overlay while hydrating.** While the auth store
 *    hasn't read the Firebase session yet (`hydrated() ===
 *    false`) we render the `SplashComponent` instead of any
 *    route. This covers the F5 / hard-refresh case so the user
 *    doesn't see the destination flicker.
 *
 * 2. **Second line of defense for the auth guard.** The
 *    `AuthGuard` is the *first* line: it runs at navigation
 *    time. But because it has to let traffic through while
 *    the store is hydrating, a navigation can land on a
 *    protected route *before* Firebase has answered "no
 *    session". When that answer comes back we kick the user
 *    to `/auth/login` from here, so they can't see the
 *    dashboard shell with a logged-out `AuthStore`. This is
 *    the only reliable place to enforce that contract — the
 *    guard alone is one-shot.
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
  private readonly router = inject(Router);

  readonly showSplash = computed(() => !this.authStore.hydrated());

  constructor() {
    // Reactive guard: once the store has answered and the
    // user is not authenticated, bounce to the login screen.
    // This catches the case where a navigation got through the
    // guard during the "hydrating" window and Firebase then
    // confirmed there's no session.
    effect(() => {
      if (this.authStore.hydrated() && !this.authStore.isAuthenticated()) {
        void this.router.navigate(['/auth/login']);
      }
    });
  }
}
