import { describe, it, expect } from 'vitest';
import { makeUser, type User } from './user.entity';

/**
 * Unit tests for the User domain entity factory.
 *
 * `makeUser` is a pure function that takes the raw shape pulled from
 * Firestore and produces a normalized User value object. It strips
 * `undefined` and surfaces a useful error when the required `uid` is
 * missing.
 */

describe('User domain entity', () => {
  it('makeUser returns a normalized User when uid + email are present', () => {
    const user: User = makeUser({ uid: 'abc-123', email: 'ada@example.com', nombre: 'Ada' });

    expect(user.uid).toBe('abc-123');
    expect(user.email).toBe('ada@example.com');
    expect(user.nombre).toBe('Ada');
  });

  it('makeUser falls back to email local-part when nombre is missing', () => {
    const user = makeUser({ uid: 'u1', email: 'ada@example.com' });

    expect(user.nombre).toBe('ada');
  });

  it('makeUser throws when uid is missing (cannot exist in the system without an id)', () => {
    expect(() =>
      makeUser({ uid: '', email: 'ada@example.com', nombre: 'Ada' }),
    ).toThrow(/uid/i);
  });
});
