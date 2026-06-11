import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Subject, type Observable } from 'rxjs';

import { ItemStore } from './item.store';
import { ITEM_PORT, type ItemDraft } from './item.port';
import { AUTH_PORT } from '../../auth/application/auth.port';
import { type User } from '../../auth/domain/user.entity';
import { type Item } from '../domain/item.entity';

/**
 * Unit tests for the ItemStore (NgRx SignalStore).
 *
 * Scenarios from openspec/specs/income-expense-management/spec.md:
 *   - Add income item (3.4): `addItem` calls the port, patches
 *     `loading`, and the listener keeps `items` in sync.
 *   - Confirm delete (3.6): `deleteItem` calls the port and the
 *     listener removes the item from state.
 *   - Remote item added (3.6): the listener patches `items` when
 *     the port emits a new array.
 *   - Create error (3.10): `addItem` captures the port's rejection
 *     into `error` and clears `loading`.
 *   - Sync error (3.10): the listener patches `error` when the
 *     port stream errors out.
 *
 * The ItemPort AND the AuthPort are replaced with Vitest mocks so
 * no real Firebase or Auth dependency is involved. The store reads
 * `authState$()` to know which collection to listen to.
 */

interface MockItemPort {
  create: Mock;
  delete: Mock;
  listenItems: Mock;
  refreshItems: Mock;
  itemsSubject: Subject<readonly Item[]>;
}

interface MockAuthPort {
  signIn: Mock;
  signUp: Mock;
  signOut: Mock;
  authState$: Mock;
  userSubject: Subject<User | null>;
}

const ITEM_INC: Item = { uid: 'i1', descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso', fecha: 1 };
const ITEM_EXP: Item = { uid: 'e1', descripcion: 'Alquiler', monto: 500, tipo: 'egreso', fecha: 2 };
const TEST_USER: User = { uid: 'u1', email: 'ada@example.com', nombre: 'Ada' };

function createMockItemPort(): MockItemPort {
  const subject = new Subject<readonly Item[]>();
  return {
    itemsSubject: subject,
    create: vi.fn().mockResolvedValue('new-id'),
    delete: vi.fn().mockResolvedValue(undefined),
    listenItems: vi.fn(() => subject.asObservable() as Observable<readonly Item[]>),
    refreshItems: vi.fn(() => subject.asObservable() as Observable<readonly Item[]>),
  };
}

function createMockAuthPort(): MockAuthPort {
  const subject = new Subject<User | null>();
  return {
    userSubject: subject,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    authState$: vi.fn(() => subject.asObservable() as Observable<User | null>),
  };
}

function setup(options: { initialUser?: User | null; initialItems?: readonly Item[] } = {}) {
  const itemPort = createMockItemPort();
  const authPort = createMockAuthPort();

  TestBed.configureTestingModule({
    providers: [
      { provide: ITEM_PORT, useValue: itemPort },
      { provide: AUTH_PORT, useValue: authPort },
    ],
  });

  const store = TestBed.inject(ItemStore);

  // Drive the auth state pipeline synchronously after the store's
  // onInit subscription is in place. `queueMicrotask` schedules the
  // emission after the current microtask — which is when the
  // onInit subscription has been wired up.
  queueMicrotask(() => {
    if (options.initialUser !== undefined) {
      authPort.userSubject.next(options.initialUser);
    } else {
      authPort.userSubject.next(null);
    }
  });

  // Seed the items stream once the items subscription lands. We
  // wait for one extra microtask to let `switchMap` wire up the
  // listenItems call before emitting.
  if (options.initialItems) {
    queueMicrotask(() => {
      queueMicrotask(() => itemPort.itemsSubject.next(options.initialItems!));
    });
  } else if (options.initialUser) {
    queueMicrotask(() => {
      queueMicrotask(() => itemPort.itemsSubject.next([]));
    });
  }

  return { store, port: itemPort, authPort };
}

describe('ItemStore', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts with empty items and not loading', async () => {
    const { store } = setup();
    // Allow the auth-state microtask to land, then the items seed.
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(store.items()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('loads the initial items from the port in onInit (sync baseline)', async () => {
    const { store } = setup({ initialUser: TEST_USER, initialItems: [ITEM_INC] });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(store.items()).toEqual([ITEM_INC]);
  });

  it('addItem() calls port.create and the post-write refresh keeps state in sync (add-income-item)', async () => {
    const { store, port } = setup({ initialUser: TEST_USER });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const newItem: Item = { uid: 'new-id', descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso', fecha: 1 };
    port.create.mockResolvedValueOnce('new-id');

    const draft: ItemDraft = { descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso' };
    const addPromise = store.addItem('u1', draft);
    // The refreshItems subscription is wired synchronously *inside*
    // refreshList — emit the new list from the next microtask so
    // the subscription is already in place.
    queueMicrotask(() => port.itemsSubject.next([newItem]));
    await addPromise;

    expect(port.create).toHaveBeenCalledWith('u1', draft);
    expect(port.refreshItems).toHaveBeenCalledWith('u1');
    expect(store.items()).toEqual([newItem]);
    expect(store.loading()).toBe(false);
  });

  it('addItem() captures a rejection into error and clears loading (create-error)', async () => {
    const { store, port } = setup({ initialUser: TEST_USER });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    port.create.mockRejectedValueOnce(new Error('Firestore down'));

    const draft: ItemDraft = { descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso' };
    await store.addItem('u1', draft);

    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Firestore down');
  });

  it('addItem() patches the Zod error message when the payload is invalid', async () => {
    const { store, port } = setup({ initialUser: TEST_USER });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    await store.addItem('u1', { descripcion: '', monto: 1, tipo: 'ingreso' });

    expect(store.error()).toBe('La descripción es obligatoria');
    expect(port.create).not.toHaveBeenCalled();
  });

  it('deleteItem() calls port.delete and the post-write refresh removes the item (confirm-delete)', async () => {
    const { store, port } = setup({ initialUser: TEST_USER, initialItems: [ITEM_INC, ITEM_EXP] });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(store.items()).toHaveLength(2);

    port.delete.mockResolvedValueOnce(undefined);
    const deletePromise = store.deleteItem('u1', 'e1');
    // The refreshItems subscription is wired synchronously *inside*
    // refreshList — emit the shorter list from the next microtask.
    queueMicrotask(() => port.itemsSubject.next([ITEM_INC]));
    await deletePromise;

    expect(port.delete).toHaveBeenCalledWith('u1', 'e1');
    expect(port.refreshItems).toHaveBeenCalledWith('u1');
    expect(store.items()).toEqual([ITEM_INC]);
  });

  it('patches items when the port emits a new list (remote-item-added)', async () => {
    const { store, port } = setup({ initialUser: TEST_USER });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(store.items()).toEqual([]);

    port.itemsSubject.next([ITEM_INC, ITEM_EXP]);
    expect(store.items()).toHaveLength(2);
    expect(store.items().map((i) => i.uid)).toEqual(['i1', 'e1']);
  });

  it('patches error when the port stream errors (sync-error)', async () => {
    const { store, port } = setup({ initialUser: TEST_USER });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    port.itemsSubject.error(new Error('Permission denied'));
    expect(store.error()).toBe('Permission denied');
  });

  it('exposes a derived totals signal that sums items by tipo', async () => {
    const { store, port } = setup({ initialUser: TEST_USER, initialItems: [ITEM_INC, ITEM_EXP] });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(store.totals().ingresos).toBe(1000);
    expect(store.totals().egresos).toBe(500);
    expect(store.totals().balance).toBe(500);
    expect(store.totals().count).toBe(2);

    // Remote delete updates the totals too.
    port.itemsSubject.next([ITEM_INC]);
    expect(store.totals().egresos).toBe(0);
    expect(store.totals().balance).toBe(1000);
  });
});
