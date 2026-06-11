import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';

import { ItemStore } from '../../ingresos-egresos/application/item.store';
import {
  buildDoughnutData,
  buildBarDataByMonth,
  type ChartData,
} from '../domain/chart-data.vo';

/**
 * Application-layer Signal Store for the dashboard.
 *
 * The dashboard has NO local state of its own — every value it
 * exposes is a `computed()` derived from `ItemStore.items()`. This
 * is the "shared data source" requirement from the
 * dashboard-analytics spec: the dashboard and the items list are
 * two views over the same underlying state, not two independent
 * caches.
 *
 * Computed signals exposed:
 *   - `totalIngresos` / `totalEgresos` — running sums by `tipo`.
 *   - `balance` — `ingresos - egresos` (may be negative).
 *   - `count` — number of items in the underlying list.
 *   - `doughnutData` — Chart.js payload for the proportion chart.
 *   - `barData` — Chart.js payload for the per-month comparison.
 *
 * The store is provided in `root` and is the single read-side
 * entry point for the dashboard components. Writing is NOT
 * exposed here — adding/removing items is the `ItemStore`'s job.
 *
 * Implementation note: `withComputed`'s factory is called once
 * per store instance, so we lift the `items` selector into a
 * local `computed` and reuse it across the totals — keeps the
 * subscription graph shallow and lets `balance` derive from
 * `totalIngresos` / `totalEgresos` (not from `items` twice).
 */
export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const itemStore = inject(ItemStore);
    const items = computed(() => itemStore.items());
    const totalIngresos = computed(() =>
      items().reduce((sum, i) => sum + (i.tipo === 'ingreso' ? i.monto : 0), 0),
    );
    const totalEgresos = computed(() =>
      items().reduce((sum, i) => sum + (i.tipo === 'egreso' ? i.monto : 0), 0),
    );
    return {
      totalIngresos,
      totalEgresos,
      balance: computed(() => totalIngresos() - totalEgresos()),
      count: computed(() => items().length),
      doughnutData: computed<ChartData>(() => buildDoughnutData(items())),
      barData: computed<ChartData>(() => buildBarDataByMonth(items())),
    };
  }),
);

/** Public type for the DashboardStore instance. */
export type DashboardStore = InstanceType<typeof DashboardStore>;
