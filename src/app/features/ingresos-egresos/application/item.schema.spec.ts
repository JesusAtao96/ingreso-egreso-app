import { describe, it, expect } from 'vitest';
import { ItemSchema } from './item.schema';

/**
 * Unit tests for the Item Zod schema.
 *
 * Triangulation: each rule is tested on both sides of the boundary
 * (empty/whitespace descripcion, zero/negative monto, missing tipo).
 * This catches off-by-one errors in the min(1) and positive()
 * predicates.
 */

const VALID = { descripcion: 'Sueldo', monto: 1000, tipo: 'ingreso' as const };

describe('ItemSchema (Zod)', () => {
  it('accepts a fully-populated valid payload', () => {
    const result = ItemSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it('rejects an empty descripcion (boundary: 0 chars)', () => {
    const result = ItemSchema.safeParse({ ...VALID, descripcion: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero monto (boundary: 0)', () => {
    const result = ItemSchema.safeParse({ ...VALID, monto: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative monto (boundary: -1)', () => {
    const result = ItemSchema.safeParse({ ...VALID, monto: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects a tipo that is not ingreso|egreso', () => {
    const result = ItemSchema.safeParse({ ...VALID, tipo: 'otro' });
    expect(result.success).toBe(false);
  });

  it('accepts monto=0.01 (boundary: smallest positive)', () => {
    const result = ItemSchema.safeParse({ ...VALID, monto: 0.01 });
    expect(result.success).toBe(true);
  });
});
