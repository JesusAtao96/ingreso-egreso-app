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
 * The guard is a thin CanActivateFn that reads `AuthStore.isAuthenticated()`.
 * We assert the contract: a UrlTree when unauthenticated, `true` when
 * authenticated. The end-to-end flow is covered by the Playwright suite.
 */

const TEST_USER: User = { uid: 'u1', email: 'a@b.co', nombre: 'Ada' };

interface Setup {
  port: Partial<AuthPort>;
  injector: EnvironmentInjector;
  store: AuthStore;
  guard: CanActivateFn;
}

function setup(initialUser: User | null = null): Setup {
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

  if (initialUser) {
    queueMicrotask(() => subject.next(initialUser));
  }

  return { port, injector, store, guard: authGuardFn };
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

  it('returns a UrlTree pointing to /auth/login when no user is signed in (unauthenticated-access)', () => {
    const s = setup(null);
    const result = runGuard(s);

    expect(s.store.isAuthenticated()).toBe(false);
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/auth/login');
  });

  it('returns true when the user is authenticated (authenticated-access)', async () => {
    const s = setup(TEST_USER);

    // Wait one microtask tick so the AuthStore's onInit subscription
    // receives the seeded user.
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(s.store.isAuthenticated()).toBe(true);
    const result = runGuard(s);
    expect(result).toBe(true);
  });
});
