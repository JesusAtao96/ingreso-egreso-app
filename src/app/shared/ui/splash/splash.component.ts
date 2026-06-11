import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthStore } from '../../../features/auth/application/auth.store';

/**
 * Global splash overlay.
 *
 * Rendered by `AppComponent` while the auth store hasn't
 * finished its first read of the Firebase session. Its only
 * job is to make the F5 / hard-refresh feel smooth — instead
 * of flashing the login page and then the dashboard, the user
 * sees a calm loading state until we know enough to route
 * them.
 *
 * Theme-aware via the existing design tokens; the splash uses
 * the same `glass-card` utility as the rest of the app, so
 * the light vs. dark treatment falls out of the body gradient
 * and surface tokens automatically.
 */
@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  template: `
    <div
      class="min-h-screen flex items-center justify-center px-4 py-8"
      data-testid="splash"
    >
      <div
        class="glass-card flex flex-col items-center gap-6 px-10 py-10 w-full max-w-sm"
      >
        <img
          src="assets/images/logo.svg"
          alt="logo"
          class="h-12 w-auto"
        />
        <div class="flex flex-col items-center gap-2">
          <span
            class="material-symbols-outlined text-4xl text-(--color-accent) animate-spin"
          >
            progress_activity
          </span>
          <p class="text-sm text-(--color-ink-muted) m-0">
            {{ message() }}
          </p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashComponent {
  private readonly authStore = inject(AuthStore);

  message(): string {
    // Reuse the store's loading flag for a slightly more
    // accurate "loading" message. While still hydrating we say
    // "Cargando tu sesión…"; once we know the user we can be
    // friendlier, but in practice hydration is the only time
    // this component is on screen.
    return this.authStore.hydrated() ? 'Preparando tu panel…' : 'Cargando tu sesión…';
  }
}
