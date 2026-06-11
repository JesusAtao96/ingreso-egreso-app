/**
 * Zod schema for an income/expense form payload.
 *
 * Mirrors the rules from openspec/specs/income-expense-management:
 *   - non-empty descripcion
 *   - positive monto
 *   - tipo in {ingreso, egreso}
 *
 * The store uses this to validate form submissions; the components
 * use it to render the same Spanish error messages. Keeping both
 * pointing at the same source of truth means the UI and the
 * persistence layer cannot disagree.
 */
import { z } from 'zod/v4';

export const ItemSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  monto: z.number().positive('El monto debe ser positivo'),
  tipo: z.enum(['ingreso', 'egreso'], {
    message: 'Elegí si es ingreso o egreso',
  }),
});

export type ItemInput = z.infer<typeof ItemSchema>;
