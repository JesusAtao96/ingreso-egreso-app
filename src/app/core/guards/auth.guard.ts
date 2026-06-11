import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthStore } from '../../features/auth/application/auth.store';

/**
 * Functional auth guard.
 *
 * Reads `isAuthenticated()` from the AuthStore (which is kept in sync
 * with Firebase via the port listener). When the user is signed in,
 * allow the navigation. When they are not, redirect to `/login`.
 *
 * This guard depends only on the `AuthStore` — it does not know about
 * Firebase. Swapping the auth backend would only require rebinding the
 * `AUTH_PORT` token.
 */
export const authGuardFn: CanActivateFn = (): boolean | UrlTree => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  return authStore.isAuthenticated() ? true : router.parseUrl('/auth/login');
};
