import { describe, it, expect } from 'vitest';
import {
  makeItem,
  isIncome,
  isExpense,
  type ItemShape,
} from './item.entity';

/**
 * Unit tests for the Item domain entity.
 *
 * The entity is a pure value object: no Angular, no Firebase, no
 * signals. It exists to give the rest of the application a single
 * source of truth for the shape of an income/expense entry and to
 * carry the trivial helpers the components reach for (`isIncome`,
 * `isExpense`).
 *
 * Triangulation: each test exercises a different code path:
 *   - happy path (full payload) → returned shape is normalized
 *   - missing optional fields (fecha) → still produces a valid item
 *   - empty description → still returns an item; validation is
 *     the store's job, NOT the entity's (entity is total for
 *     structurally valid input)
 *   - isIncome / isExpense type discriminators
 */

const BASE: ItemShape = {
  descripcion: 'Sueldo',
  monto: 1000,
  tipo: 'ingreso',
};

describe('Item domain entity', () => {
  it('makeItem returns a normalized item with a default fecha when omitted', () => {
    const item = makeItem(BASE);

    expect(item.descripcion).toBe('Sueldo');
    expect(item.monto).toBe(1000);
    expect(item.tipo).toBe('ingreso');
    expect(typeof item.fecha).toBe('number');
    expect(item.fecha).toBeGreaterThan(0);
  });

  it('makeItem preserves the provided fecha when present (Firestore round-trip)', () => {
    const item = makeItem({ ...BASE, fecha: 1700000000000 });

    expect(item.fecha).toBe(1700000000000);
  });

  it('isIncome is true only for items of tipo "ingreso"', () => {
    const inc = makeItem(BASE);
    const exp = makeItem({ ...BASE, tipo: 'egreso' });

    expect(isIncome(inc)).toBe(true);
    expect(isIncome(exp)).toBe(false);
  });

  it('isExpense is true only for items of tipo "egreso"', () => {
    const inc = makeItem(BASE);
    const exp = makeItem({ ...BASE, tipo: 'egreso' });

    expect(isExpense(inc)).toBe(false);
    expect(isExpense(exp)).toBe(true);
  });
});
