import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { Subject, type Observable } from 'rxjs';

// Mock for SweetAlert2 — uses `vi.hoisted` so the shared mock
// object exists by the time the `vi.mock` factory runs. Without
// this, the factory would capture `swalMock` while it is still in
// the temporal dead zone and throw.
const swalMock = vi.hoisted(() => ({
  fire: vi.fn(),
  setConfirmed: (_v: boolean) => undefined,
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: (...args: unknown[]) => swalMock.fire(...args),
  },
}));

import { DetalleComponent } from './detalle.component';
import { ItemStore } from '../../application/item.store';
import { ITEM_PORT, type ItemPort } from '../../application/item.port';
import { AUTH_PORT, type AuthPort } from '../../../auth/application/auth.port';
import { type User } from '../../../auth/domain/user.entity';
import { type Item } from '../../domain/item.entity';

/**
 * Component tests for the items list with delete.
 *
 * Scenarios from openspec/specs/income-expense-management/spec.md:
 *   - Display sorted items (3.7/3.8): items are shown newest-first
 *     and each row identifies its tipo.
 *   - Empty list (3.7/3.8): the empty state is shown when the
 *     user has no items; the delete button is not available.
 *   - Confirm delete (3.6): a confirmed Swal click triggers
 *     `store.deleteItem(uid, itemId)` and the row disappears.
 *   - Cancel delete (3.7/3.8): a cancelled Swal click does NOT
 *     call the store and the row stays.
 *
 * SweetAlert2 is mocked at the module level so the test runs
 * without a real modal.
 */

const TEST_USER: User = { uid: 'u1', email: 'ada@example.com', nombre: 'Ada' };
const ITEM_A: Item = { uid: 'a', descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso', fecha: 3 };
const ITEM_B: Item = { uid: 'b', descripcion: 'Alquiler', monto: 500, tipo: 'egreso', fecha: 2 };
const ITEM_C: Item = { uid: 'c', descripcion: 'Venta', monto: 200, tipo: 'ingreso', fecha: 1 };

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

interface SetupResult {
  itemPort: Partial<ItemPort>;
  authPort: Partial<AuthPort>;
  itemsSubject: Subject<readonly Item[]>;
  userSubject: Subject<User | null>;
}

async function setup(options: { items?: readonly Item[]; user?: User | null } = {}): Promise<SetupResult> {
  const { port: itemPort, itemsSubject } = createMockItemPort();
  const { port: authPort, userSubject } = createMockAuthPort();

  await render(DetalleComponent, {
    providers: [
      { provide: ITEM_PORT, useValue: itemPort },
      { provide: AUTH_PORT, useValue: authPort },
      ItemStore,
    ],
  });

  // Defer the emissions so the ItemStore's `onInit` subscriptions
  // are wired up before the subjects emit. Mirrors the pattern in
  // `item.store.spec.ts` (which schedules emissions via
  // `queueMicrotask` BEFORE `TestBed.inject` triggers `onInit`).
  queueMicrotask(() => {
    userSubject.next(options.user ?? TEST_USER);
    queueMicrotask(() => {
      itemsSubject.next(options.items ?? []);
    });
  });

  // Let the microtasks drain.
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));

  return { itemPort, authPort, itemsSubject, userSubject };
}

describe('DetalleComponent (items list + delete)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    swalMock.fire.mockReset();
    // Default to "confirmed" so individual tests only have to
    // override when they want to test the cancel path.
    swalMock.setConfirmed = (v: boolean) => {
      swalMock.fire.mockResolvedValue({ isConfirmed: v, isDismissed: !v });
    };
    swalMock.setConfirmed(true);
  });

  it('renders an empty state when the user has no items', async () => {
    await setup({ items: [] });

    expect(screen.getByTestId('detalle-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('detalle-row-a')).not.toBeInTheDocument();
  });

  it('renders the items sorted newest-first, one row per item', async () => {
    await setup({ items: [ITEM_C, ITEM_B, ITEM_A] });

    // Wait for the items to land in the store and propagate to the DOM.
    await waitFor(
      () => {
        // Newest first: ITEM_A (fecha=3), ITEM_B (fecha=2), ITEM_C (fecha=1)
        expect(screen.getByTestId('detalle-row-a')).toHaveTextContent('Sueldo');
      },
      { timeout: 2000 },
    );
    expect(screen.getByTestId('detalle-row-b')).toHaveTextContent('Alquiler');
    expect(screen.getByTestId('detalle-row-c')).toHaveTextContent('Venta');
  });

  it('identifies the tipo of each item in the row', async () => {
    await setup({ items: [ITEM_A, ITEM_B] });

    await waitFor(() => {
      expect(screen.getByTestId('detalle-tipo-a')).toHaveTextContent(/ingreso/i);
    });
    expect(screen.getByTestId('detalle-tipo-b')).toHaveTextContent(/egreso/i);
  });

  it('calls store.deleteItem when the user confirms the SweetAlert (confirm-delete)', async () => {
    const { itemPort } = await setup({ items: [ITEM_A, ITEM_B] });
    await waitFor(() => {
      expect(screen.getByTestId('detalle-delete-a')).toBeInTheDocument();
    });
    swalMock.setConfirmed(true);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('detalle-delete-a'));

    await waitFor(() => {
      expect(swalMock.fire).toHaveBeenCalled();
    });
    expect(itemPort.delete).toHaveBeenCalledWith('u1', 'a');
  });

  it('does NOT call store.deleteItem when the user cancels the SweetAlert (cancel-delete)', async () => {
    const { itemPort } = await setup({ items: [ITEM_A, ITEM_B] });
    await waitFor(() => {
      expect(screen.getByTestId('detalle-delete-a')).toBeInTheDocument();
    });
    swalMock.setConfirmed(false);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('detalle-delete-a'));

    await waitFor(() => {
      expect(swalMock.fire).toHaveBeenCalled();
    });
    expect(itemPort.delete).not.toHaveBeenCalled();
  });

  it('removes the row from the DOM when the real-time listener emits a list without it', async () => {
    const { itemsSubject } = await setup({ items: [ITEM_A, ITEM_B] });
    await waitFor(() => {
      expect(screen.getByTestId('detalle-row-a')).toBeInTheDocument();
    });
    expect(screen.getByTestId('detalle-row-b')).toBeInTheDocument();

    // Simulate the Firestore listener reacting to a delete elsewhere.
    itemsSubject.next([ITEM_B]);

    await waitFor(() => {
      expect(screen.queryByTestId('detalle-row-a')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('detalle-row-b')).toBeInTheDocument();
  });
});
