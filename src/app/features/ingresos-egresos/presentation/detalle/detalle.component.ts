import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { AUTH_PORT } from '../../../auth/application/auth.port';
import { type User } from '../../../auth/domain/user.entity';
import { ItemStore } from '../../application/item.store';
import { sortByFechaDesc } from '../../domain/aggregation.fns';
import { type Item } from '../../domain/item.entity';

/**
 * Items list with delete.
 *
 * Reads the items stream from `ItemStore` and renders them
 * newest-first. Each row exposes a delete button that opens a
 * SweetAlert2 confirmation modal. The actual delete is delegated
 * to `ItemStore.deleteItem`; the row disappears when the real-time
 * listener (driven by the port) emits a list that no longer
 * contains the item.
 *
 * Reads the current uid from the same auth port the store uses
 * so the delete call has a uid to hand to the adapter. When the
 * user is signed out, no items are shown (the store's listener
 * emits an empty list in that case).
 */
@Component({
  selector: 'app-detalle',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './detalle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleComponent {
  private readonly itemStore = inject(ItemStore);
  private readonly authPort = inject(AUTH_PORT);

  // Cache the latest user for the click handler. We don't need a
  // signal here because the template only renders when the items
  // list has rows, and the uid is only consumed at click time.
  private currentUser: User | null = null;

  /** Items rendered newest-first, sorted once per signal emission. */
  readonly sortedItems = computed<readonly Item[]>(() =>
    sortByFechaDesc(this.itemStore.items()),
  );

  constructor() {
    this.authPort.authState$().subscribe({
      next: (user: User | null) => {
        this.currentUser = user;
      },
      error: () => undefined,
    });
  }

  /**
   * Open the SweetAlert2 confirmation modal. When the user
   * confirms, call `store.deleteItem(uid, itemId)`. When they
   * cancel, do nothing.
   *
   * SweetAlert2 is **dynamically imported** so its ~215 kB
   * never lands in the initial bundle — the detalle page is
   * the only consumer, so the import is deferred until the
   * user actually clicks "Eliminar".
   */
  async onDelete(item: Item): Promise<void> {
    const { default: Swal } = await import('sweetalert2');
    const result = await Swal.fire({
      title: '¿Eliminar registro?',
      text: `Vas a borrar "${item.descripcion}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    });

    if (!result.isConfirmed) {
      return;
    }
    const uid = this.currentUser?.uid;
    const itemId = item.uid;
    if (!uid || !itemId) {
      return;
    }
    await this.itemStore.deleteItem(uid, itemId);
  }
}
