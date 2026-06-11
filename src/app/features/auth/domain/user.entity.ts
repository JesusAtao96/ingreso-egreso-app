/**
 * Domain entity: User.
 *
 * Mirrors the Firestore `users/{uid}` document. The `uid` is the
 * Firebase Auth identifier; the rest is the user profile written by
 * the register flow.
 *
 * Pure factory `makeUser` lives next to the type so domain code can
 * normalize raw shapes (Firestore snapshots, partial updates) without
 * importing any infrastructure concerns.
 */

export interface User {
  readonly uid: string;
  readonly email: string;
  readonly nombre: string;
}

export interface UserShape {
  uid?: string | null;
  email?: string | null;
  nombre?: string | null;
}

/**
 * Normalize a raw user record into a `User` value object.
 *
 * - Throws when `uid` is empty/missing — without an id, the user does
 *   not exist in the system.
 * - Falls back to the email local-part when `nombre` is missing, so
 *   legacy profiles written before the field was required still render
 *   something meaningful in the UI.
 */
export function makeUser(raw: UserShape): User {
  const uid = raw.uid ?? '';
  if (!uid) {
    throw new Error('User.uid is required to build a User value object');
  }
  const email = raw.email ?? '';
  const nombre = raw.nombre && raw.nombre.trim().length > 0
    ? raw.nombre
    : email.split('@')[0] ?? 'usuario';
  return { uid, email, nombre };
}
