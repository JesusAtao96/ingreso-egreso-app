import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UrlTree, type CanActivateFn } from '@angular/router';
import { runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { Subject } from 'rxjs';

import { authGuardFn } from './auth.guard';
import { AUTH_PORT, type AuthPort } from '../../features/auth/application/auth.port';
import { AuthStore } from '../../features/auth/application/auth.store';
import { type User } from '../../features/auth/domain/user.entity';

/**
 * Pure unit tests for `authGuardFn`.
 *
 * The guard is a thin CanActivateFn that reads from `AuthStore`.
 * We assert three branches:
 *   - Not yet hydrated → returns `true` (let the AppComponent
 *     show a splash; we'll re-decide when the auth state
 *     arrives).
 *   - Hydrated and authenticated → `true`.
 *   - Hydrated and unauthenticated → `UrlTree` to `/auth/login`.
 *
 * The end-to-end flow is covered by the Playwright suite.
 */

const TEST_USER: User = { uid: 'u1', email: 'a@b.co', nombre: 'Ada' };

interface Setup {
  port: Partial<AuthPort>;
  injector: EnvironmentInjector;
  store: AuthStore;
  guard: CanActivateFn;
  emit: (user: User | null) => void;
}

function setup(): Setup {
  const subject = new Subject<User | null>();
  const port: Partial<AuthPort> = {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    authState$: vi.fn(() => subject.asObservable()),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: AUTH_PORT, useValue: port },
      AuthStore,
    ],
  });

  const injector = TestBed.inject(EnvironmentInjector);
  const store = runInInjectionContext(injector, () => TestBed.inject(AuthStore));

  return {
    port,
    injector,
    store,
    guard: authGuardFn,
    emit: (user) => subject.next(user),
  };
}

function runGuard(setupResult: Setup) {
  return runInInjectionContext(setupResult.injector, () =>
    setupResult.guard({} as never, {} as never),
  );
}

describe('authGuardFn', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('returns true when not yet hydrated so the AppComponent can show a splash (hydrating-access)', () => {
    const s = setup();
    // Before the first authState$ emission.
    expect(s.store.hydrated()).toBe(false);

    const result = runGuard(s);
    expect(result).toBe(true);
  });

  it('returns a UrlTree pointing to /auth/login when hydrated and no user is signed in (unauthenticated-access)', async () => {
    const s = setup();
    s.emit(null);
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(s.store.hydrated()).toBe(true);
    expect(s.store.isAuthenticated()).toBe(false);

    const result = runGuard(s);
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/auth/login');
  });

  it('returns true when hydrated and the user is authenticated (authenticated-access)', async () => {
    const s = setup();
    s.emit(TEST_USER);
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(s.store.hydrated()).toBe(true);
    expect(s.store.isAuthenticated()).toBe(true);

    const result = runGuard(s);
    expect(result).toBe(true);
  });
});
