import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withMethods,
  withHooks,
  withComputed,
  patchState,
} from '@ngrx/signals';

import { AUTH_PORT } from './auth.port';
import { type User } from '../domain/user.entity';

/**
 * State shape for the AuthStore. Kept narrow on purpose — UI only
 * sees what it needs (current user, busy flag, last error, and
 * a `hydrated` flag that flips true the first time the Firebase
 * `authState$` stream emits).
 *
 * The `hydrated` flag is what the `AuthGuard` watches: before the
 * first emission we don't yet know whether the session is
 * restored from disk, so we can't decide yet whether to let the
 * user in or kick them to /login. Showing a global splash while
 * we wait is the cleanest fix for the "F5 sends me to /login
 * for a second" flicker.
 */
export interface AuthStoreState {
  user: User | null;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
}

const INITIAL_STATE: AuthStoreState = {
  user: null,
  // `loading` starts true because we're about to ask Firebase
  // whether a session is restored — anything we render before
  // that returns would be a guess. The AppComponent shows a
  // splash while this is true.
  loading: true,
  error: null,
  // `hydrated` flips true the first time authState$ emits.
  // Until then, AuthGuard waits instead of redirecting.
  hydrated: false,
};

/**
 * AuthSignalStore — the application-layer entry point for auth.
 *
 * Built with `@ngrx/signals` (Angular 21 compatible). Three concerns:
 *
 *   1. **State** — `user`, `loading`, `error` are signals you read
 *      directly from the store instance.
 *   2. **Methods** — `login`, `register`, `logout` delegate to the
 *      `AuthPort`. They set `loading`, then either let the
 *      auth-state subscription patch `user`, or capture the error.
 *   3. **Hooks** — `onInit` subscribes to `authState$` and keeps
 *      `state.user` in sync with whatever the port emits. This is how
 *      "session restored on reload" works in one line.
 *
 * The store is provided in root by `core/di/app.providers.ts` and is
 * the single source of truth for "is there a logged-in user?".
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthStoreState>(INITIAL_STATE),
  withComputed((state) => ({
    isAuthenticated: computed(() => state.user() !== null),
  })),
  withMethods((store) => {
    const port = inject(AUTH_PORT);

    return {
      async login(email: string, password: string): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          await port.signIn(email, password);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          patchState(store, { loading: false, error: message });
          return;
        }
        // We don't `patchState({ loading: false })` here — the
        // auth-state subscription will fire with the new user, and
        // that hook resets loading too. Defensive: in case the
        // subscription is slow, clear loading now as well.
        patchState(store, { loading: false });
      },

      async register(nombre: string, email: string, password: string): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          await port.signUp(nombre, email, password);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          patchState(store, { loading: false, error: message });
          return;
        }
        patchState(store, { loading: false });
      },

      async logout(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          await port.signOut();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          patchState(store, { loading: false, error: message });
          return;
        }
        // The auth-state subscription will set user=null.
        patchState(store, { loading: false });
      },

      clearError(): void {
        patchState(store, { error: null });
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Resolve the port from the injection context. We can't `inject`
      // inside withMethods anymore because the lifecycle is different.
      const port = inject(AUTH_PORT);
      const sub = port.authState$().subscribe({
        next: (user) => {
          patchState(store, {
            user,
            loading: false,
            error: null,
            hydrated: true,
          });
        },
        error: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          // Even on error, mark hydrated — we tried and failed, so
          // AuthGuard can now decide (it'll see user=null and
          // redirect to /auth/login).
          patchState(store, {
            error: message,
            loading: false,
            hydrated: true,
          });
        },
      });
      // Keep the subscription alive for the lifetime of the store.
      // (NgRx SignalStore instances live for the app lifetime when
      // providedIn: 'root' — leaking the subscription is intentional.)
      void sub;
    },
  }),
);

/** Public type for the AuthStore instance (handy for component inputs). */
export type AuthStore = InstanceType<typeof AuthStore>;
