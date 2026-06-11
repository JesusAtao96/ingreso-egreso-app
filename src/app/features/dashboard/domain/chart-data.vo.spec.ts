import { describe, it, expect } from 'vitest';

import {
  buildDoughnutData,
  buildBarDataByMonth,
  groupItemsByMonth,
  DEFAULT_DOUGHNUT_COLORS,
  type ChartDataset,
  type MonthlyAggregate,
} from './chart-data.vo';
import { type Item } from '../../ingresos-egresos/domain/item.entity';

/**
 * Unit tests for the dashboard chart-data value object.
 *
 * These helpers are the analytical primitives used by the
 * `DashboardStore` to feed Chart.js. They are deliberately pure: no
 * Angular, no TestBed, no signals — easy to test, easy to reason
 * about, easy to reuse in tests that want a known chart shape.
 *
 * Scenarios from openspec/specs/dashboard-analytics/spec.md:
 *   - Correct totals → `buildDoughnutData` uses ingresos/egresos
 *     totals from the input items.
 *   - Proportion rendered → data values are not hardcoded; they
 *     come from the input.
 *   - Single type data → when one side is zero, the dataset still
 *     has two entries so Chart.js renders cleanly.
 *   - No monthly data → `buildBarDataByMonth` returns empty labels
 *     and zeros for both series.
 *   - Mixed monthly data → `buildBarDataByMonth` groups by month
 *     key and sums per type.
 */

const INC: Item = { uid: 'i1', descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso', fecha: 1 };
const EXP: Item = { uid: 'e1', descripcion: 'Alquiler', monto: 500, tipo: 'egreso', fecha: 2 };

describe('dashboard chart-data value object', () => {
  describe('buildDoughnutData', () => {
    it('returns ingresos and egresos values plus two labels (correct-totals)', () => {
      const data = buildDoughnutData([INC, EXP]);

      expect(data.labels).toEqual(['Ingresos', 'Egresos']);
      expect(data.datasets).toHaveLength(1);
      const dataset = data.datasets[0]!;
      expect(dataset.data).toEqual([1000, 500]);
      expect(dataset.backgroundColor).toEqual(DEFAULT_DOUGHNUT_COLORS);
    });

    it('produces zeros for the empty input (no-monthly-data equivalent)', () => {
      const data = buildDoughnutData([]);

      expect(data.labels).toEqual(['Ingresos', 'Egresos']);
      const dataset = data.datasets[0]!;
      expect(dataset.data).toEqual([0, 0]);
    });

    it('keeps both labels visible when only one type is present (single-type-data)', () => {
      const data = buildDoughnutData([
        { descripcion: 'Sueldo', monto: 800, tipo: 'ingreso', fecha: 1 },
      ]);

      // The doughnut MUST still have two labels + two values so the
      // chart renders the available type proportionally without
      // failing on the missing side.
      expect(data.labels).toEqual(['Ingresos', 'Egresos']);
      const dataset = data.datasets[0]!;
      expect(dataset.data).toEqual([800, 0]);
    });
  });

  describe('groupItemsByMonth + buildBarDataByMonth', () => {
    it('returns an empty shape when there are no items (no-monthly-data)', () => {
      const groups = groupItemsByMonth([]);
      expect(groups).toEqual([]);

      const data = buildBarDataByMonth([]);
      expect(data.labels).toEqual([]);
      expect(data.datasets).toHaveLength(2);
      const ingresosSeries = data.datasets.find((d) => d.label === 'Ingresos')!;
      const egresosSeries = data.datasets.find((d) => d.label === 'Egresos')!;
      expect(ingresosSeries.data).toEqual([]);
      expect(egresosSeries.data).toEqual([]);
    });

    it('groups mixed items into the right month buckets and sums per type (mixed-monthly-data)', () => {
      // 2026-01: 1 ingreso 1000 + 1 egreso 200
      // 2026-02: 1 ingreso 500  + 1 egreso 300
      const items: readonly Item[] = [
        { descripcion: 'Sueldo enero', monto: 1000, tipo: 'ingreso', fecha: Date.UTC(2026, 0, 5) },
        { descripcion: 'Café enero', monto: 200, tipo: 'egreso', fecha: Date.UTC(2026, 0, 31) },
        { descripcion: 'Venta febrero', monto: 500, tipo: 'ingreso', fecha: Date.UTC(2026, 1, 10) },
        { descripcion: 'Comida febrero', monto: 300, tipo: 'egreso', fecha: Date.UTC(2026, 1, 15) },
      ];

      const groups = groupItemsByMonth(items);

      expect(groups).toHaveLength(2);
      const [jan, feb] = groups as MonthlyAggregate[];
      expect(jan.label).toBe('2026-01');
      expect(jan.ingresos).toBe(1000);
      expect(jan.egresos).toBe(200);
      expect(feb.label).toBe('2026-02');
      expect(feb.ingresos).toBe(500);
      expect(feb.egresos).toBe(300);

      const data = buildBarDataByMonth(items);
      expect(data.labels).toEqual(['2026-01', '2026-02']);
      const ingresosSeries = data.datasets.find((d) => d.label === 'Ingresos') as ChartDataset;
      const egresosSeries = data.datasets.find((d) => d.label === 'Egresos') as ChartDataset;
      expect(ingresosSeries.data).toEqual([1000, 500]);
      expect(egresosSeries.data).toEqual([200, 300]);
    });
  });
});
