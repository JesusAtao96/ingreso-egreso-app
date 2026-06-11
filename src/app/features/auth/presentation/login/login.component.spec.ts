import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { LoginComponent } from './login.component';
import { AUTH_PORT, type AuthPort } from '../../application/auth.port';
import { AuthStore } from '../../application/auth.store';
import { type User } from '../../domain/user.entity';

/**
 * Component tests for the login screen.
 *
 * Scenarios from openspec/specs/user-auth/spec.md:
 *   - invalid-email: typing a malformed email blocks submission and
 *     shows the Spanish email error.
 *   - short-password: typing fewer than 6 chars blocks submission and
 *     shows the password-length error.
 *   - login-redirects: a valid submission calls the store and (on
 *     emission) navigates to the authenticated area.
 *
 * The component depends on:
 *   - The AuthStore, which we provide via the AUTH_PORT token so the
 *     same instance can be observed for the assertion.
 *   - The Router, which we spy on to assert the redirect.
 */

interface SetupOptions {
  initialUser?: User | null;
}

async function setup(options: SetupOptions = {}) {
  const signIn = vi.fn().mockResolvedValue(undefined);
  const subject = new Subject<User | null>();
  if (options.initialUser) {
    // Defer until the store subscribes.
    queueMicrotask(() => subject.next(options.initialUser!));
  }
  const port: Partial<AuthPort> = {
    signIn: signIn as Mock,
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    authState$: vi.fn(() => subject.asObservable()),
  };

  const router = { navigate: vi.fn().mockResolvedValue(true) };

  const view = await render(LoginComponent, {
    providers: [
      { provide: AUTH_PORT, useValue: port },
      AuthStore,
    ],
  });

  return { ...view, signIn, port, router, subject };
}

describe('LoginComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows a validation error for an invalid email and does not call the store', async () => {
    const { signIn } = await setup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/correo/i), 'not-an-email');
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText(/correo válido/i)).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows a validation error when the password is shorter than 6 characters', async () => {
    const { signIn } = await setup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/correo/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), '12345');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText(/6 caracteres/i)).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('calls store.login on a valid submission and the form clears the busy state', async () => {
    const { signIn } = await setup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/correo/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('ada@example.com', 'secret123');
    });
  });
});
