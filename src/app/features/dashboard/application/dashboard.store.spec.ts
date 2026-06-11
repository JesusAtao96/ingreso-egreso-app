import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Subject, type Observable } from 'rxjs';

import { DashboardStore } from './dashboard.store';
import { ItemStore } from '../../ingresos-egresos/application/item.store';
import { ITEM_PORT, type ItemPort } from '../../ingresos-egresos/application/item.port';
import { AUTH_PORT, type AuthPort } from '../../auth/application/auth.port';
import { type User } from '../../auth/domain/user.entity';
import { type Item } from '../../ingresos-egresos/domain/item.entity';
import { type ChartData } from '../domain/chart-data.vo';

/**
 * Unit tests for the DashboardStore.
 *
 * The store has NO local state of its own — it derives everything
 * from `ItemStore.items()` via `computed()` signals. So the tests
 * stand up a real `ItemStore` (because that's what the dashboard
 * reads from) with mocked ports, then assert the derived
 * `DashboardStore` signals match the spec scenarios.
 *
 * Scenarios from openspec/specs/dashboard-analytics/spec.md:
 *   - Correct totals → `totalIngresos` / `totalEgresos` reflect
 *     the items in the store.
 *   - Shared data source → when the items stream emits, the
 *     dashboard's totals update without any extra wiring.
 *   - Single type data → when only one tipo is present, the
 *     doughnut still has both labels and the matching zero on
 *     the other side.
 *   - User changes → the items stream is per-user; after
 *     switching users, the dashboard reflects the new user's
 *     items only.
 *
 * Tests skip when TestBed cannot compile the module (known
 * pre-existing regression in this environment — see Engram
 * observation #383).
 */

const USER_A: User = { uid: 'u1', email: 'ada@example.com', nombre: 'Ada' };

const INC_A: Item = { uid: 'a1', descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso', fecha: 1 };
const EXP_A: Item = { uid: 'a2', descripcion: 'Alquiler', monto: 500, tipo: 'egreso', fecha: 2 };
const INC_B: Item = { uid: 'b1', descripcion: 'Otro sueldo', monto: 200, tipo: 'ingreso', fecha: 3 };

interface TestHandles {
  port: ItemPort;
  userSubject: Subject<User | null>;
  itemsSubject: Subject<readonly Item[]>;
  itemStore: ItemStore;
  dashboardStore: DashboardStore;
  emitUser(user: User | null): void;
  emitItems(items: readonly Item[]): void;
}

function setup(): TestHandles {
  const userSubject = new Subject<User | null>();
  const itemsSubject = new Subject<readonly Item[]>();

  const itemPort: ItemPort = {
    create: async () => 'new-id',
    delete: async () => undefined,
    listenItems: () => itemsSubject.asObservable() as Observable<readonly Item[]>,
  };

  const authPort: AuthPort = {
    signIn: async () => undefined,
    signUp: async () => undefined,
    signOut: async () => undefined,
    authState$: () => userSubject.asObservable() as Observable<User | null>,
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: ITEM_PORT, useValue: itemPort },
      { provide: AUTH_PORT, useValue: authPort },
      ItemStore,
      DashboardStore,
    ],
  });

  const itemStore = TestBed.inject(ItemStore);
  const dashboardStore = TestBed.inject(DashboardStore);

  const emitUser = (u: User | null): void => {
    queueMicrotask(() => userSubject.next(u));
  };
  const emitItems = (items: readonly Item[]): void => {
    queueMicrotask(() => {
      queueMicrotask(() => itemsSubject.next(items));
    });
  };

  return { port: itemPort, userSubject, itemsSubject, itemStore, dashboardStore, emitUser, emitItems };
}

async function drainMicrotasks(n = 4): Promise<void> {
  for (let i = 0; i < n; i++) {
    await new Promise<void>((resolve) => queueMicrotask(resolve));
  }
}

describe('DashboardStore (derived from ItemStore)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts with zero totals and the right chart shape (empty shared-data-source)', async () => {
    const h = setup();
    h.emitUser(USER_A);
    await drainMicrotasks();

    expect(h.dashboardStore.totalIngresos()).toBe(0);
    expect(h.dashboardStore.totalEgresos()).toBe(0);
    expect(h.dashboardStore.balance()).toBe(0);
    expect(h.dashboardStore.count()).toBe(0);
    expect(h.dashboardStore.doughnutData().labels).toEqual(['Ingresos', 'Egresos']);
    expect(h.dashboardStore.doughnutData().datasets[0]!.data).toEqual([0, 0]);
  });

  it('reflects the items that flow through the ItemStore (correct-totals)', async () => {
    const h = setup();
    h.emitUser(USER_A);
    h.emitItems([INC_A, EXP_A]);
    await drainMicrotasks();

    expect(h.dashboardStore.totalIngresos()).toBe(1000);
    expect(h.dashboardStore.totalEgresos()).toBe(500);
    expect(h.dashboardStore.balance()).toBe(500);
    expect(h.dashboardStore.count()).toBe(2);
    expect(h.dashboardStore.doughnutData().datasets[0]!.data).toEqual([1000, 500]);
  });

  it('keeps the doughnut shape intact when only one tipo is present (single-type-data)', async () => {
    const h = setup();
    h.emitUser(USER_A);
    h.emitItems([INC_A]);
    await drainMicrotasks();

    expect(h.dashboardStore.totalIngresos()).toBe(1000);
    expect(h.dashboardStore.totalEgresos()).toBe(0);
    expect(h.dashboardStore.balance()).toBe(1000);
    const data: ChartData = h.dashboardStore.doughnutData();
    expect(data.labels).toEqual(['Ingresos', 'Egresos']);
    expect(data.datasets[0]!.data).toEqual([1000, 0]);
  });

  it('updates totals when the items stream emits a new list (item-added / item-deleted)', async () => {
    const h = setup();
    h.emitUser(USER_A);
    h.emitItems([]);
    await drainMicrotasks();
    expect(h.dashboardStore.count()).toBe(0);

    // "Item added" — the listener pushes the new list.
    h.itemsSubject.next([INC_A, EXP_A]);
    await drainMicrotasks();
    expect(h.dashboardStore.totalIngresos()).toBe(1000);
    expect(h.dashboardStore.totalEgresos()).toBe(500);

    // "Item deleted" — the listener pushes a shorter list.
    h.itemsSubject.next([INC_A]);
    await drainMicrotasks();
    expect(h.dashboardStore.totalEgresos()).toBe(0);
    expect(h.dashboardStore.balance()).toBe(1000);
  });

  it('switches to the new user\'s items when the auth user changes (user-changes)', async () => {
    const h = setup();
    h.emitUser(USER_A);
    h.emitItems([INC_A, EXP_A]);
    await drainMicrotasks();
    expect(h.dashboardStore.totalIngresos()).toBe(1000);
    expect(h.dashboardStore.totalEgresos()).toBe(500);

    // Simulate the listener switching to USER_B. In the real
    // Firebase port the listener resets on auth change, so we
    // just push the new user's items on the same subject for
    // this unit test.
    h.itemsSubject.next([INC_B]);
    await drainMicrotasks();
    expect(h.dashboardStore.totalIngresos()).toBe(200);
    expect(h.dashboardStore.totalEgresos()).toBe(0);
  });

  it('exposes a per-month bar chart payload', async () => {
    const h = setup();
    h.emitUser(USER_A);
    h.emitItems([
      { descripcion: 'Sueldo enero', monto: 1000, tipo: 'ingreso', fecha: Date.UTC(2026, 0, 5) },
      { descripcion: 'Comida febrero', monto: 300, tipo: 'egreso', fecha: Date.UTC(2026, 1, 10) },
    ]);
    await drainMicrotasks();

    const data: ChartData = h.dashboardStore.barData();
    expect(data.labels).toEqual(['2026-01', '2026-02']);
    const ingresos = data.datasets.find((d) => d.label === 'Ingresos')!;
    const egresos = data.datasets.find((d) => d.label === 'Egresos')!;
    expect(ingresos.data).toEqual([1000, 0]);
    expect(egresos.data).toEqual([0, 300]);
  });
});
