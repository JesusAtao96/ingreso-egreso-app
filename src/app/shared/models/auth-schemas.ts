import { z } from 'zod/v4';

/**
 * Zod schemas for authentication forms.
 *
 * These will move to `features/auth/domain/` once that slice is built
 * (Phase 2). Placed here temporarily so Zod is wired from the start.
 */

export const LoginSchema = z.object({
  email: z.string().email('Ingresá un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const RegisterSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Ingresá un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

/** Inferred types for login / register payloads */
export type LoginPayload = z.infer<typeof LoginSchema>;
export type RegisterPayload = z.infer<typeof RegisterSchema>;
