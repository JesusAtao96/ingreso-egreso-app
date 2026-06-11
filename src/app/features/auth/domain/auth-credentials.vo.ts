import { LoginSchema, RegisterSchema, type LoginPayload, type RegisterPayload } from '../../../shared/models/auth-schemas';

/**
 * Domain value object: AuthCredentials.
 *
 * Wraps the Zod schemas behind a thin parser API. The store and the
 * components don't have to know about Zod directly — they only see
 * `AuthCredentials` / `RegisterCredentials` and either get a parsed
 * payload back or a thrown `ZodError`.
 *
 * The errors live in `safeParse` form inside the store (so the UI can
 * render field-level errors), but the value object itself is
 * total-correct: invalid input blows up.
 */

export type AuthCredentials = LoginPayload;
export type RegisterCredentials = RegisterPayload;

export function parseLoginCredentials(input: unknown): AuthCredentials {
  return LoginSchema.parse(input);
}

export function parseRegisterCredentials(input: unknown): RegisterCredentials {
  return RegisterSchema.parse(input);
}
