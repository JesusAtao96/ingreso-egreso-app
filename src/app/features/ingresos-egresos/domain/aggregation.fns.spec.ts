import { describe, it, expect } from 'vitest';
import {
  computeTotals,
  groupByType,
  sortByFechaDesc,
  type Totals,
} from './aggregation.fns';
import { type Item } from './item.entity';

/**
 * Unit tests for the income/expense aggregation functions.
 *
 * These are pure helpers used by the store (totals as computed
 * signals) and the dashboard (chart data). They are pure: no
 * Angular, no Firebase, no signals.
 *
 * Triangulation rationale:
 *   - `computeTotals`: zero items (boundary) + a mix of items
 *     (the only interesting case). One extra case for the
 *     "all expenses" path to make sure signs are consistent.
 *   - `groupByType`: empty list (boundary) + mixed list.
 *   - `sortByFechaDesc`: already-sorted + reverse-sorted + tie
 *     handling.
 */

const ITEMS_MIXED: Item[] = [
  { uid: 'a', descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso', fecha: 3 },
  { uid: 'b', descripcion: 'Alquiler', monto: 500, tipo: 'egreso', fecha: 1 },
  { uid: 'c', descripcion: 'Venta', monto: 200, tipo: 'ingreso', fecha: 2 },
];

describe('income/expense aggregation', () => {
  describe('computeTotals', () => {
    it('returns all zeros when there are no items (boundary)', () => {
      const totals: Totals = computeTotals([]);

      expect(totals.ingresos).toBe(0);
      expect(totals.egresos).toBe(0);
      expect(totals.balance).toBe(0);
      expect(totals.count).toBe(0);
    });

    it('sums ingresos, egresos, and balance across a mixed list', () => {
      const totals = computeTotals(ITEMS_MIXED);

      expect(totals.ingresos).toBe(1200);
      expect(totals.egresos).toBe(500);
      expect(totals.balance).toBe(700);
      expect(totals.count).toBe(3);
    });

    it('produces a negative balance when there are only expenses (sign check)', () => {
      const totals = computeTotals([
        { descripcion: 'Café', monto: 100, tipo: 'egreso', fecha: 1 },
        { descripcion: 'Comida', monto: 250, tipo: 'egreso', fecha: 2 },
      ]);

      expect(totals.ingresos).toBe(0);
      expect(totals.egresos).toBe(350);
      expect(totals.balance).toBe(-350);
      expect(totals.count).toBe(2);
    });
  });

  describe('groupByType', () => {
    it('returns two empty arrays when given no items (boundary)', () => {
      const groups = groupByType([]);

      expect(groups.ingresos).toEqual([]);
      expect(groups.egresos).toEqual([]);
    });

    it('splits a mixed list into the right buckets, preserving order', () => {
      const groups = groupByType(ITEMS_MIXED);

      expect(groups.ingresos.map((i) => i.descripcion)).toEqual(['Sueldo', 'Venta']);
      expect(groups.egresos.map((i) => i.descripcion)).toEqual(['Alquiler']);
    });
  });

  describe('sortByFechaDesc', () => {
    it('sorts a mixed list newest-first (boundary: out-of-order input)', () => {
      const sorted = sortByFechaDesc(ITEMS_MIXED);

      expect(sorted.map((i) => i.uid)).toEqual(['a', 'c', 'b']);
    });

    it('is a no-op for an already-sorted list', () => {
      const sorted = sortByFechaDesc([
        { descripcion: 'a', monto: 1, tipo: 'ingreso', fecha: 3 },
        { descripcion: 'b', monto: 1, tipo: 'ingreso', fecha: 2 },
        { descripcion: 'c', monto: 1, tipo: 'ingreso', fecha: 1 },
      ]);

      expect(sorted.map((i) => i.descripcion)).toEqual(['a', 'b', 'c']);
    });

    it('treats equal fechas as stable (preserves input order)', () => {
      const sorted = sortByFechaDesc([
        { descripcion: 'a', monto: 1, tipo: 'ingreso', fecha: 1 },
        { descripcion: 'b', monto: 1, tipo: 'ingreso', fecha: 1 },
        { descripcion: 'c', monto: 1, tipo: 'ingreso', fecha: 1 },
      ]);

      // JavaScript Array.prototype.sort is stable in modern engines.
      expect(sorted.map((i) => i.descripcion)).toEqual(['a', 'b', 'c']);
    });
  });
});
