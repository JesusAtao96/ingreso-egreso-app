import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, type Observable } from 'rxjs';

import { AppComponent } from './app.component';
import { AUTH_PORT } from './features/auth/application/auth.port';
import { AuthStore } from './features/auth/application/auth.store';
import { type User } from './features/auth/domain/user.entity';

/**
 * Unit tests for the `AppComponent` reactive guard.
 *
 * The static `authGuardFn` is the *first* line of defense at
 * navigation time, but it deliberately lets traffic through
 * while the auth store is hydrating (so the splash can show
 * instead of a flicker). To cover the case where Firebase
 * then confirms "no session" AFTER a navigation already
 * landed on a protected route, `AppComponent` runs an
 * `effect` that watches the auth state and routes to
 * `/auth/login` when hydration completes unauthenticated.
 */

const TEST_USER: User = { uid: 'u1', email: 'a@b.co', nombre: 'Ada' };

interface MockPort {
  signIn: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  authState$: ReturnType<typeof vi.fn>;
  authSubject: Subject<User | null>;
}

function setup(): { port: MockPort; subject: Subject<User | null>; router: { navigate: ReturnType<typeof vi.fn> } } {
  const subject = new Subject<User | null>();
  const port: MockPort = {
    authSubject: subject,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    authState$: vi.fn(() => subject.asObservable() as Observable<User | null>),
  };

  const router = { navigate: vi.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      { provide: AUTH_PORT, useValue: port },
      AuthStore,
      { provide: Router, useValue: router },
    ],
  });

  return { port, subject, router };
}

describe('AppComponent — reactive auth guard', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to /auth/login once hydration finishes without a user (post-hydration-bounce)', () => {
    const { subject, router } = setup();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    // No emission yet → effect should not have called navigate.
    expect(router.navigate).not.toHaveBeenCalled();

    // Emit null after subscription. The signal change triggers
    // the effect on the next change detection cycle.
    subject.next(null);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does NOT redirect when the user is authenticated (no-bounce-when-authed)', () => {
    const { subject, router } = setup();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    subject.next(TEST_USER);
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
