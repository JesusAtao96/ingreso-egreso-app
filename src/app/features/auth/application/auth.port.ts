import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../domain/user.entity';

/**
 * Application-level port for authentication.
 *
 * The AuthStore depends on this interface, not on any specific SDK.
 * The Firebase implementation lives in
 * `infrastructure/firebase-auth.adapter.ts` and is bound to the
 * `AUTH_PORT` injection token at the root level.
 *
 * Why a port:
 *   - Keeps the application layer free of Firebase imports.
 *   - Makes unit testing trivial: hand a `Partial<AuthPort>` to the
 *     store's `provideState` call and you're done.
 *   - Aligns with the "Clean Architecture" goal in `design.md`.
 */
export interface AuthPort {
  /**
   * Authenticate an existing user with email + password.
   * Resolves with `void` on success. Rejects on invalid credentials.
   */
  signIn(email: string, password: string): Promise<void>;

  /**
   * Create a brand-new Firebase Auth account AND a matching
   * `{uid}/usuario` Firestore profile document.
   * Resolves with `void` on success. Rejects if the email is already
   * in use or the profile write fails.
   */
  signUp(nombre: string, email: string, password: string): Promise<void>;

  /** End the current session. Resolves once Firebase confirms. */
  signOut(): Promise<void>;

  /**
   * Stream the current `User` (or `null` when signed out). The
   * implementation MUST emit a value on every change so the
   * `AuthStore` can react via `patchState`.
   */
  authState$(): Observable<User | null>;
}

/**
 * Injection token for the auth port. Use this in components, stores,
 * and tests so the binding can be swapped without touching the
 * production code.
 */
export const AUTH_PORT = new InjectionToken<AuthPort>('AUTH_PORT');
