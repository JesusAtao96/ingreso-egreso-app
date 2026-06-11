import { describe, it, expect } from 'vitest';
import { LoginSchema, RegisterSchema } from '../../../shared/models/auth-schemas';
import { parseLoginCredentials, parseRegisterCredentials, type AuthCredentials } from './auth-credentials.vo';

/**
 * Unit tests for the AuthCredentials value object.
 *
 * These wrappers delegate to the Zod schemas but return a value object
 * that is easier to consume from the AuthStore (e.g. `.valid` / `.errors`
 * shape) and that throws on structurally invalid input (defensive: the
 * store should never have an invalid credentials object lying around).
 *
 * The actual validation messages are pinned by the underlying Zod
 * schemas and are covered by the auth-schemas tests in the shared
 * module — here we only assert the boundary.
 */

const VALID_LOGIN = { email: 'ada@example.com', password: 'secret123' };

describe('AuthCredentials value object', () => {
  it('parseLoginCredentials returns the parsed payload when the input is valid', () => {
    const creds: AuthCredentials = parseLoginCredentials(VALID_LOGIN);
    expect(creds.email).toBe('ada@example.com');
    expect(creds.password).toBe('secret123');
  });

  it('parseLoginCredentials throws ZodError on invalid input (no silent acceptance)', () => {
    expect(() =>
      parseLoginCredentials({ email: 'bad', password: '1' }),
    ).toThrow();
  });

  it('parseRegisterCredentials returns the parsed payload for matching passwords', () => {
    const data = parseRegisterCredentials({
      nombre: 'Ada',
      email: 'ada@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    expect(data.nombre).toBe('Ada');
    expect(data.confirmPassword).toBe('secret123');
  });

  it('parseRegisterCredentials throws on mismatched passwords', () => {
    expect(() =>
      parseRegisterCredentials({
        nombre: 'Ada',
        email: 'ada@example.com',
        password: 'secret123',
        confirmPassword: 'other999',
      }),
    ).toThrow();
  });

  it('LoginSchema accepts exactly a 6-character password (boundary)', () => {
    // Boundary triangulation: 5 chars fails, 6 chars passes.
    const tooShort = LoginSchema.safeParse({ email: 'a@b.co', password: '12345' });
    const exactlySix = LoginSchema.safeParse({ email: 'a@b.co', password: '123456' });
    expect(tooShort.success).toBe(false);
    expect(exactlySix.success).toBe(true);
  });

  it('RegisterSchema rejects when confirmPassword is shorter than 6 chars even if it matches', () => {
    const result = RegisterSchema.safeParse({
      nombre: 'Ada',
      email: 'ada@example.com',
      password: 'secret123',
      confirmPassword: '12345',
    });
    expect(result.success).toBe(false);
  });
});
