/**
 * Pure aggregation helpers for income/expense items.
 *
 * These are the analytics primitives used by the ItemStore (for the
 * running totals) and the DashboardStore (for the chart data). They
 * are deliberately kept as pure functions so they can be tested
 * without Angular, TestBed, or any signal plumbing.
 *
 * Each helper:
 *   - Accepts `readonly Item[]` (so it is safe to call with the
 *     signal's value).
 *   - Returns a fresh object / array (no mutation of the input).
 *   - Handles the empty case explicitly (a `Totals` of all zeros
 *     and two empty buckets) so callers never have to null-check.
 */

import { type Item } from './item.entity';

/** Running totals for the income/expense list. */
export interface Totals {
  /** Sum of all `ingreso` items. Always >= 0. */
  readonly ingresos: number;
  /** Sum of all `egreso` items. Always >= 0. */
  readonly egresos: number;
  /** `ingresos - egresos`. May be negative. */
  readonly balance: number;
  /** Number of items in the input. */
  readonly count: number;
}

/** Two-bucket partition of items by tipo. */
export interface ItemsByType {
  readonly ingresos: readonly Item[];
  readonly egresos: readonly Item[];
}

/**
 * Sum the income/expense items into a Totals value object.
 *
 * Edge case: when the list is empty or `null`/`undefined` is
 * passed in (defensive), all fields are zero. The store calls this
 * directly from a `computed()` so the empty-list path is exercised
 * every time the user has no data yet.
 */
export function computeTotals(items: readonly Item[] | null | undefined): Totals {
  if (!items || items.length === 0) {
    return { ingresos: 0, egresos: 0, balance: 0, count: 0 };
  }
  let ingresos = 0;
  let egresos = 0;
  for (const item of items) {
    if (item.tipo === 'ingreso') {
      ingresos += item.monto;
    } else if (item.tipo === 'egreso') {
      egresos += item.monto;
    }
  }
  return {
    ingresos,
    egresos,
    balance: ingresos - egresos,
    count: items.length,
  };
}

/**
 * Partition the items into the two `tipo` buckets. Original order
 * is preserved inside each bucket (the dashboard shows them in
 * whatever order they arrived in, then a separate sort happens at
 * the view layer if needed).
 */
export function groupByType(items: readonly Item[] | null | undefined): ItemsByType {
  if (!items || items.length === 0) {
    return { ingresos: [], egresos: [] };
  }
  const ingresos: Item[] = [];
  const egresos: Item[] = [];
  for (const item of items) {
    if (item.tipo === 'ingreso') {
      ingresos.push(item);
    } else if (item.tipo === 'egreso') {
      egresos.push(item);
    }
  }
  return { ingresos, egresos };
}

/**
 * Return a new array with the items sorted newest-first by `fecha`.
 *
 * `fecha` is optional on the shared `Item` type, so we normalize it
 * to `0` when missing (which pushes those items to the end of the
 * newest-first ordering — defensible since items without a `fecha`
 * haven't been finalized by the adapter yet).
 *
 * Uses `Array.prototype.sort` which is stable in V8/SpiderMonkey/
 * JavaScriptCore, so equal-`fecha` items preserve their input order.
 * The input array is NOT mutated — we slice first.
 */
export function sortByFechaDesc(items: readonly Item[] | null | undefined): Item[] {
  if (!items || items.length === 0) {
    return [];
  }
  return items.slice().sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0));
}
