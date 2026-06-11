import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { Subject, type Observable } from 'rxjs';

import { ItemsComponent } from './items.component';
import { ItemStore } from '../../application/item.store';
import { ITEM_PORT, type ItemPort, type ItemDraft } from '../../application/item.port';
import { AUTH_PORT, type AuthPort } from '../../../auth/application/auth.port';
import { type User } from '../../../auth/domain/user.entity';
import { type Item } from '../../domain/item.entity';

/**
 * Component tests for the "add item" form.
 *
 * Scenarios from openspec/specs/income-expense-management/spec.md:
 *   - Reject invalid item (3.10): empty description / non-positive
 *     monto are blocked by signal-form validation BEFORE the store
 *     is touched.
 *   - Add income item (3.4): a valid submission calls
 *     `store.addItem(uid, draft)`.
 *   - Create error (3.10): when the store captures a rejection,
 *     the component surfaces the message in the alert.
 *
 * The component is rendered with a real `ItemStore` instance so
 * the validation+submission path runs end-to-end. The store's port
 * and the auth port are replaced with mocks.
 */

const TEST_USER: User = { uid: 'u1', email: 'ada@example.com', nombre: 'Ada' };
const VALID_INC: ItemDraft = { descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso' };

function createMockItemPort(): { port: Partial<ItemPort>; itemsSubject: Subject<readonly Item[]> } {
  const itemsSubject = new Subject<readonly Item[]>();
  const port: Partial<ItemPort> = {
    create: vi.fn().mockResolvedValue('new-id'),
    delete: vi.fn().mockResolvedValue(undefined),
    listenItems: vi.fn(() => itemsSubject.asObservable() as Observable<readonly Item[]>),
  };
  return { port, itemsSubject };
}

function createMockAuthPort(): { port: Partial<AuthPort>; userSubject: Subject<User | null> } {
  const userSubject = new Subject<User | null>();
  const port: Partial<AuthPort> = {
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    authState$: vi.fn(() => userSubject.asObservable() as Observable<User | null>),
  };
  return { port, userSubject };
}

async function setup(options: { user?: User | null; createError?: string | null } = {}) {
  const { port: itemPort, itemsSubject } = createMockItemPort();
  const { port: authPort, userSubject } = createMockAuthPort();

  const view = await render(ItemsComponent, {
    providers: [
      { provide: ITEM_PORT, useValue: itemPort },
      { provide: AUTH_PORT, useValue: authPort },
      ItemStore,
    ],
  });

  // Seed the auth user. The store's onInit already subscribed; we
  // emit synchronously after the render finishes.
  userSubject.next(options.user ?? TEST_USER);
  itemsSubject.next([]);

  return { ...view, itemPort, authPort, userSubject, itemsSubject };
}

describe('ItemsComponent (add item form)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('rejects an empty descripcion before calling the store (validation)', async () => {
    const { itemPort } = await setup();
    const user = userEvent.setup();

    // The field starts empty; just type a valid monto and submit so
    // the only validation failure is the missing descripcion.
    await user.type(screen.getByLabelText(/monto/i), '100');
    await user.click(screen.getByRole('button', { name: /agregar/i }));

    expect(await screen.findByText(/descripción es obligatoria/i)).toBeInTheDocument();
    expect(itemPort.create).not.toHaveBeenCalled();
  });

  it('rejects a non-positive monto before calling the store (validation)', async () => {
    const { itemPort } = await setup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/descripción/i), 'Café');
    await user.type(screen.getByLabelText(/monto/i), '0');
    await user.click(screen.getByRole('button', { name: /agregar/i }));

    expect(await screen.findByText(/monto debe ser positivo/i)).toBeInTheDocument();
    expect(itemPort.create).not.toHaveBeenCalled();
  });

  it('calls store.addItem on a valid submission (add-income-item)', async () => {
    const { itemPort } = await setup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/descripción/i), 'Sueldo');
    await user.type(screen.getByLabelText(/monto/i), '1000');
    // The default tipo is "ingreso" — assert via the visible select.
    await user.click(screen.getByRole('button', { name: /agregar/i }));

    await waitFor(() => {
      expect(itemPort.create).toHaveBeenCalledWith('u1', VALID_INC);
    });
  });

  it('surfaces a friendly error from the store when the port rejects (create-error)', async () => {
    const { itemPort } = await setup();
    (itemPort.create as Mock).mockRejectedValueOnce(new Error('Firestore down'));
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/descripción/i), 'Sueldo');
    await user.type(screen.getByLabelText(/monto/i), '1000');
    // Submit and let the async action + state patch settle.
    await user.click(screen.getByRole('button', { name: /agregar/i }));
    // Flush microtasks so the rejected promise from `port.create` is
    // processed by the store before we look for the alert.
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    await waitFor(
      () => {
        expect(screen.getByTestId('items-server-error')).toHaveTextContent(/firestore down/i);
      },
      { timeout: 2000 },
    );
  });
});
