/**
 * Pure aggregation helpers for the dashboard charts.
 *
 * The dashboard composes two Chart.js visualizations:
 *   - A **doughnut** that shows the income/expense **proportion**
 *     (totals across the whole list).
 *   - A **bar** chart that shows **per-month** income/expense
 *     comparison (so the user can see when their balance is shifting).
 *
 * The functions in this file turn the `Item[]` from the `ItemStore`
 * into plain data shapes that ng2-charts can consume. Everything is
 * pure: no Angular, no TestBed, no Chart.js import. That keeps the
 * test surface small (these specs are the same style as the
 * `aggregation.fns.spec.ts` in the ingresos-egresos feature) and
 * lets the dashboard unit tests pin down the contract of the
 * chart payload without standing up a component.
 *
 * Each helper:
 *   - Accepts `readonly Item[]` (so it can be called with the
 *     `ItemStore.items()` signal value).
 *   - Returns a fresh object on every call (no mutation of input).
 *   - Handles the empty case explicitly so the chart never has to
 *     null-check before rendering.
 */

import { type Item } from '../../ingresos-egresos/domain/item.entity';

/**
 * The shape ng2-charts' `<canvas baseChart [data]="...">` expects.
 *
 * Kept intentionally minimal — only the fields the dashboard
 * actually configures. ng2-charts accepts an `unknown` payload,
 * but typing it makes the call sites clearer and the compiler
 * catches mistakes.
 */
export interface ChartData {
  readonly labels: readonly string[];
  readonly datasets: readonly ChartDataset[];
}

export interface ChartDataset {
  readonly label?: string;
  readonly data: readonly number[];
  readonly backgroundColor?: string | readonly string[];
  readonly borderColor?: string | readonly string[];
  readonly borderWidth?: number;
  readonly fill?: boolean;
  readonly tension?: number;
}

/** Default slice colors for the income/expense doughnut. */
export const DEFAULT_DOUGHNUT_COLORS: readonly string[] = ['#28a745', '#dc3545'];

/** Default line colors for the monthly bar chart. */
export interface BarColors {
  readonly ingresos: string;
  readonly egresos: string;
}

export const DEFAULT_BAR_COLORS: BarColors = {
  ingresos: '#28a745',
  egresos: '#dc3545',
};

/**
 * A single month bucket — items with the same `YYYY-MM` key.
 *
 * Used by both the bar chart and any future "table by month"
 * presentation. The label is sortable AND human-readable
 * (`"2026-01"` sorts as a string and reads as a month).
 */
export interface MonthlyAggregate {
  /** Stable month key in the form `YYYY-MM` (sortable as a string). */
  readonly label: string;
  /** Sum of `ingreso` items in this month. Always >= 0. */
  readonly ingresos: number;
  /** Sum of `egreso` items in this month. Always >= 0. */
  readonly egresos: number;
  /** The items that contributed to this bucket (preserves input order). */
  readonly items: readonly Item[];
}

/**
 * Build the doughnut data for the income/expense proportion.
 *
 * Always returns a two-slice dataset (Ingresos, Egresos) so the
 * chart renders consistently even when one side is zero. The
 * colors come from `DEFAULT_DOUGHNUT_COLORS` and match the
 * Bootstrap 5 success / danger palette used elsewhere in the UI.
 */
export function buildDoughnutData(items: readonly Item[]): ChartData {
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
    labels: ['Ingresos', 'Egresos'],
    datasets: [
      {
        data: [ingresos, egresos],
        backgroundColor: DEFAULT_DOUGHNUT_COLORS,
      },
    ],
  };
}

/**
 * Format a Unix epoch (ms) as a sortable `YYYY-MM` key.
 *
 * Uses UTC deliberately so a server-rendered chart in one
 * timezone and a client-rendered chart in another show the same
 * bucket for the same `fecha`. (The seed data in this project
 * is small and timezones don't matter much, but this is the
 * kind of detail that bites in production.)
 */
function monthKey(fecha: number | undefined): string {
  const safeFecha = typeof fecha === 'number' ? fecha : 0;
  const d = new Date(safeFecha);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Partition the items into month buckets.
 *
 * Order in the output matches the order in which each new month
 * first appears in the input (preserves "newest month at the end"
 * semantics, which is the natural reading order for a bar chart).
 */
export function groupItemsByMonth(items: readonly Item[]): readonly MonthlyAggregate[] {
  if (items.length === 0) {
    return [];
  }
  const order: string[] = [];
  const buckets = new Map<string, MonthlyAggregate>();
  for (const item of items) {
    const key = monthKey(item.fecha);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { label: key, ingresos: 0, egresos: 0, items: [] };
      buckets.set(key, bucket);
      order.push(key);
    }
    // Re-build a new aggregate because `MonthlyAggregate` is
    // `readonly`. Cheap (one object per month) and keeps the
    // contract honest.
    const itemsSoFar: Item[] = [...bucket.items, item];
    const ingresos = bucket.ingresos + (item.tipo === 'ingreso' ? item.monto : 0);
    const egresos = bucket.egresos + (item.tipo === 'egreso' ? item.monto : 0);
    buckets.set(key, { label: key, ingresos, egresos, items: itemsSoFar });
  }
  return order.map((k) => buckets.get(k)!);
}

/**
 * Build the bar chart payload for the per-month income/expense
 * comparison.
 *
 * Two series, both aligned to the same `labels[]` array so a
 * grouped bar chart renders cleanly. When the input is empty,
 * labels and series are empty too — the chart shows an empty
 * frame, no error.
 */
export function buildBarDataByMonth(items: readonly Item[]): ChartData {
  const months = groupItemsByMonth(items);
  const labels = months.map((m) => m.label);
  const ingresosSeries = months.map((m) => m.ingresos);
  const egresosSeries = months.map((m) => m.egresos);
  return {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: ingresosSeries,
        backgroundColor: [DEFAULT_BAR_COLORS.ingresos],
        borderColor: [DEFAULT_BAR_COLORS.ingresos],
        borderWidth: 1,
      },
      {
        label: 'Egresos',
        data: egresosSeries,
        backgroundColor: [DEFAULT_BAR_COLORS.egresos],
        borderColor: [DEFAULT_BAR_COLORS.egresos],
        borderWidth: 1,
      },
    ],
  };
}
