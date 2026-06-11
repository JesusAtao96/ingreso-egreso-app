/**
 * The two kinds of items the app tracks.
 *
 * Used by the `OrdenIngresoPipe` and shared between the income/expense
 * feature and the dashboard. Kept as a string-literal union so the value
 * survives JSON serialization to/from Firestore.
 */
export type TipoItem = 'ingreso' | 'egreso';

/**
 * Domain shape of a single income/expense entry.
 *
 * The `uid` is the Firestore document id assigned by the adapter;
 * the value object is the rest of the document.
 */
export interface IncomeExpenseItem {
  uid?: string;
  descripcion: string;
  monto: number;
  tipo: TipoItem;
  fecha?: number;
}
