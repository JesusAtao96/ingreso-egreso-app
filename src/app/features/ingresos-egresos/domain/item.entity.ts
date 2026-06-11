/**
 * Domain entity: IncomeExpenseItem.
 *
 * Mirrors the Firestore document stored under
 * `users/{uid}/ingresos-egresos/items/{itemId}`. The `uid` is the
 * Firestore document id and is assigned by the adapter; everything
 * else comes from the form (descripcion, monto, tipo) or is derived
 * at write time (fecha).
 *
 * The entity is a pure value object — no Angular, no Firebase, no
 * signals. It is consumed by both the store (which persists it) and
 * the dashboard (which aggregates it).
 *
 * Re-exports the legacy shape from `shared/models` so consumers can
 * pick the closest layer. The shared `IncomeExpenseItem` and the
 * feature `Item` are kept structurally identical on purpose; the
 * feature one is the long-term home.
 */

import {
  type IncomeExpenseItem,
  type TipoItem,
} from '../../../shared/models/income-expense.type';

/** Alias so the feature's own code reads consistently. */
export type Item = IncomeExpenseItem;

/** Loose shape that may come from Firestore (fields can be null). */
export interface ItemShape {
  uid?: string | null;
  descripcion?: string | null;
  monto?: number | null;
  tipo?: TipoItem | null;
  fecha?: number | null;
}

/**
 * Normalize a raw record into a `Item` value object.
 *
 * - Provides safe defaults for missing optional fields (no `uid`, no
 *   `fecha`).
 * - Uses `Date.now()` as a fallback for `fecha` so newly created
 *   items sort to the end of the list when displayed in date order.
 * - Does NOT validate semantic correctness (positive monto,
 *   non-empty descripcion). That responsibility belongs to the
 *   Zod schema in the store / form. The entity is total for
 *   structurally-typed input.
 */
export function makeItem(raw: ItemShape): Item {
  const descripcion = raw.descripcion ?? '';
  const monto = typeof raw.monto === 'number' ? raw.monto : 0;
  const tipo: TipoItem = raw.tipo === 'egreso' ? 'egreso' : 'ingreso';
  const fecha = typeof raw.fecha === 'number' ? raw.fecha : Date.now();
  const item: Item = { descripcion, monto, tipo, fecha };
  if (raw.uid) {
    item.uid = raw.uid;
  }
  return item;
}

/** Discriminator: true when the item is an income. */
export function isIncome(item: Item): boolean {
  return item.tipo === 'ingreso';
}

/** Discriminator: true when the item is an expense. */
export function isExpense(item: Item): boolean {
  return item.tipo === 'egreso';
}
