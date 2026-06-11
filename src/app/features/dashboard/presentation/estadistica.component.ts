import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';

import { DashboardStore } from '../application/dashboard.store';

/**
 * Statistics cards + chart visualisations for the dashboard.
 *
 * Reads everything from the `DashboardStore`'s computed signals:
 *   - `totalIngresos`, `totalEgresos`, `balance` for the cards.
 *   - `doughnutData` for the proportion chart (doughnut).
 *   - `barData` for the per-month comparison (bar).
 *
 * The component is **pure presentational**: it doesn't write to
 * any store and it doesn't call any port. Everything it shows is
 * derived. That keeps the rendering contract simple and lets the
 * store tests pin down the data shape.
 *
 * Chart.js is configured via the global `provideCharts(...)` in
 * `app.config.ts`. We use the default registerables so the
 * doughnut + bar controllers are available without manual
 * `Chart.register(...)` calls.
 */
@Component({
  selector: 'app-estadistica',
  standalone: true,
  imports: [DecimalPipe, BaseChartDirective],
  templateUrl: './estadistica.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadisticaComponent {
  private readonly store = inject(DashboardStore);

  readonly totalIngresos = this.store.totalIngresos;
  readonly totalEgresos = this.store.totalEgresos;
  readonly balance = this.store.balance;
  readonly count = this.store.count;

  /**
   * ng2-charts' `<canvas baseChart [data]="...">` expects a
   * mutable-shape `ChartData` (it copies the data internally).
   * The dashboard domain returns a `readonly` shape — we widen
   * it to Chart.js' mutable shape here so the template check
   * passes, but the runtime payload is identical.
   */
  readonly doughnutData = computed<ChartData<'doughnut', number[], string>>(
    () => this.store.doughnutData() as unknown as ChartData<'doughnut', number[], string>,
  );
  readonly barData = computed<ChartData<'bar', number[], string>>(
    () => this.store.barData() as unknown as ChartData<'bar', number[], string>,
  );

  readonly doughnutType = input<'doughnut'>('doughnut');
  readonly barType = input<'bar'>('bar');

  readonly doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
    scales: {
      x: { stacked: false },
      y: { beginAtZero: true },
    },
  };
}
