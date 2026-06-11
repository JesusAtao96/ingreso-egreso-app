import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import {
  FormField,
  form,
  required,
  min,
  submit,
} from '@angular/forms/signals';

import { ItemStore } from '../../application/item.store';
import { AUTH_PORT } from '../../../auth/application/auth.port';
import { type User } from '../../../auth/domain/user.entity';

/**
 * "Add item" form.
 *
 * Captures the income/expense payload (descripcion, monto, tipo)
 * and delegates persistence to the `ItemStore`. Validation is done
 * by Angular 21 Signal Forms — the rules mirror the Zod schema in
 * `application/item.schema.ts` so the error messages the user sees
 * are identical regardless of which layer flagged the issue.
 *
 * The current uid is read from the `AUTH_PORT.authState$()`
 * subscription that the store maintains, but the form needs it
 * synchronously to call `store.addItem(uid, draft)`. We read it
 * from a local `user` signal that the component subscribes to in
 * its constructor. While the user is `null` (logged out) the
 * submit button is disabled.
 */
@Component({
  selector: 'app-items',
  standalone: true,
  imports: [FormField],
  templateUrl: './items.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsComponent {
  private readonly itemStore = inject(ItemStore);
  private readonly authPort = inject(AUTH_PORT);

  readonly user = signal<User | null>(null);
  readonly loading = this.itemStore.loading;
  readonly error = this.itemStore.error;

  readonly model = signal<{
    descripcion: string;
    monto: number;
    tipo: 'ingreso' | 'egreso';
  }>({
    descripcion: '',
    monto: 0,
    tipo: 'ingreso',
  });

  readonly itemForm = form(this.model, (schema) => {
    required(schema.descripcion, { message: 'La descripción es obligatoria' });
    min(schema.monto, 0.01, { message: 'El monto debe ser positivo' });
    required(schema.tipo, { message: 'Elegí si es ingreso o egreso' });
  });

  constructor() {
    // Subscribe to the auth state so the submit button can be
    // disabled when the user is logged out. Mirrors the same
    // pattern the ItemStore uses internally.
    this.authPort.authState$().subscribe({
      next: (user: User | null) => this.user.set(user),
      // We don't surface auth errors from this form — the auth
      // store already does that.
      error: () => undefined,
    });

    // Clear the store error when the model changes (the user is
    // fixing the input). Reading `error()` inside `untracked` keeps
    // the effect's reactive set tied ONLY to the model — otherwise
    // every error patch from the store would re-fire this effect
    // and immediately clear the error it just set.
    effect(() => {
      this.model();
      if (untracked(() => this.error())) {
        this.itemStore.clearError();
      }
    });
  }

  onSubmit(): void {
    submit(this.itemForm, async () => {
      const uid = this.user()?.uid;
      if (!uid) {
        return;
      }
      const { descripcion, monto, tipo } = this.model();
      await this.itemStore.addItem(uid, { descripcion, monto, tipo });
    });
  }
}
