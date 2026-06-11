import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthStore } from '../../features/auth/application/auth.store';

/**
 * Functional auth guard.
 *
 * Reads `isAuthenticated()` and `hydrated()` from the `AuthStore`
 * (which is kept in sync with Firebase via the port listener).
 *
 * Two branches matter:
 *
 * 1. **Not hydrated yet.** On a hard refresh the store is built
 *    with `hydrated: false` and we have to wait for Firebase to
 *    answer whether a session was restored from disk. Until then
 *    we can't decide, so we let the navigation through and the
 *    `AppComponent` splash is shown. That avoids the "F5 sends
 *    me to /login for a second" flicker.
 *
 * 2. **Hydrated.** If `isAuthenticated()` is true, allow the
 *    navigation. Otherwise redirect to `/auth/login`.
 *
 * This guard depends only on the `AuthStore` — it does not know
 * about Firebase. Swapping the auth backend would only require
 * rebinding the `AUTH_PORT` token.
 */
export const authGuardFn: CanActivateFn = (): boolean | UrlTree => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (!authStore.hydrated()) {
    // Let the destination render; the AppComponent shows a splash
    // overlay until the auth state is known.
    return true;
  }
  return authStore.isAuthenticated() ? true : router.parseUrl('/auth/login');
};
