import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Subject, type Observable } from 'rxjs';

import { AuthStore } from './auth.store';
import { AUTH_PORT } from './auth.port';
import { type User } from '../domain/user.entity';

/**
 * Unit tests for the AuthStore (NgRx SignalStore).
 *
 * Scenarios from openspec/specs/user-auth/spec.md:
 *   - Login: spec: login-redirects — successful login patches `user`
 *     and clears `loading`.
 *   - Register: spec: register — successful register patches `user`.
 *   - Logout: spec: logout — `user` is cleared, loading is reset.
 *   - Restore session: spec: restore-session — the auth-state listener
 *     patches `user` whenever the port emits a value.
 *
 * The port is replaced with a Vitest mock so no real Firebase
 * connection is made.
 */

interface MockPort {
  signIn: Mock;
  signUp: Mock;
  signOut: Mock;
  authState$: Mock;
  authSubject: Subject<User | null>;
}

const TEST_USER: User = { uid: 'u1', email: 'ada@example.com', nombre: 'Ada' };

function createMockPort(initial: User | null = null): MockPort {
  const subject = new Subject<User | null>();
  // Seed the subject so the store's onInit hook immediately patches.
  if (initial) {
    // Defer emission until after subscription is in place.
    queueMicrotask(() => subject.next(initial));
  }
  return {
    authSubject: subject,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    authState$: vi.fn(() => subject.asObservable() as Observable<User | null>),
  };
}

function setup(initial: User | null = null) {
  const port = createMockPort(initial);

  TestBed.configureTestingModule({
    providers: [{ provide: AUTH_PORT, useValue: port }],
  });

  const store = TestBed.inject(AuthStore);

  return { store, port };
}

describe('AuthStore', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts unauthenticated, loading, and not yet hydrated', () => {
    const { store } = setup();

    expect(store.user()).toBeNull();
    // `loading` is true on first creation so the AppComponent can
    // show a splash until the port's first emission.
    expect(store.loading()).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.hydrated()).toBe(false);
  });

  it('restores the session when the port emits a User on init (restore-session)', async () => {
    const { store } = setup(TEST_USER);

    // Allow the microtask to flush so onInit's subscription receives the seeded value.
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(store.user()?.uid).toBe('u1');
    expect(store.isAuthenticated()).toBe(true);
  });

  it('login() calls the port, patches loading, and patches the user when the port emits', async () => {
    const { store, port } = setup();

    await store.login('ada@example.com', 'secret123');

    expect(port.signIn).toHaveBeenCalledWith('ada@example.com', 'secret123');
    expect(store.loading()).toBe(false);

    // The store reactively picks up the authState$ emission; emit one to drive the assertion.
    port.authSubject.next(TEST_USER);
    expect(store.user()?.email).toBe('ada@example.com');
  });

  it('login() captures the error message and clears loading on failure', async () => {
    const { store, port } = setup();
    port.signIn.mockRejectedValueOnce(new Error('Invalid credentials'));

    await store.login('ada@example.com', 'wrong');

    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Invalid credentials');
  });

  it('register() calls the port with nombre/email/password and patches the user on emission', async () => {
    const { store, port } = setup();

    await store.register('Ada', 'ada@example.com', 'secret123');

    expect(port.signUp).toHaveBeenCalledWith('Ada', 'ada@example.com', 'secret123');
    port.authSubject.next(TEST_USER);
    expect(store.user()?.nombre).toBe('Ada');
  });

  it('logout() calls the port and clears the user', async () => {
    const { store, port } = setup(TEST_USER);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(store.user()?.uid).toBe('u1');

    await store.logout();

    expect(port.signOut).toHaveBeenCalled();
    port.authSubject.next(null);
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });
});
