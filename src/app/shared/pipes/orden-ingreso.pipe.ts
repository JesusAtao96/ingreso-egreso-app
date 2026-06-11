import { Pipe, PipeTransform } from '@angular/core';
import { IncomeExpenseItem } from '../models/income-expense.type';

/**
 * Pure ordering pipe: places every `ingreso` before every `egreso`
 * and keeps the original relative order within each group
 * (Array.prototype.sort is stable in modern engines).
 *
 * Marked standalone so it can be imported directly by any component.
 */
@Pipe({
  name: 'ordenIngreso',
  standalone: true,
})
export class OrdenIngresoPipe implements PipeTransform {
  transform(items: readonly IncomeExpenseItem[] | null | undefined): IncomeExpenseItem[] {
    if (!items || items.length === 0) {
      return [];
    }
    return items.slice().sort((a, b) => {
      if (a.tipo === b.tipo) {
        return 0;
      }
      return a.tipo === 'ingreso' ? -1 : 1;
    });
  }
}
