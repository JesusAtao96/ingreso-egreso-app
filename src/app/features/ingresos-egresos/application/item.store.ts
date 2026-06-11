import { computed, inject } from '@angular/core';
import { of, switchMap } from 'rxjs';
import {
  signalStore,
  withState,
  withMethods,
  withHooks,
  withComputed,
  patchState,
} from '@ngrx/signals';

import { ITEM_PORT, type ItemDraft } from './item.port';
import { ItemSchema } from './item.schema';
import { AUTH_PORT } from '../../auth/application/auth.port';
import { computeTotals } from '../domain/aggregation.fns';
import { type Item } from '../domain/item.entity';
import { type User } from '../../auth/domain/user.entity';

/**
 * State shape for the ItemStore. Three concerns:
 *   - `items`     — the list mirrored from the port listener
 *   - `loading`   — true while a write is in flight (add/delete)
 *   - `error`     — last error message (port rejection or stream error)
 *
 * The store is the single source of truth for "what items does this
 * user have?". Components, the dashboard, and the navbar/footer all
 * derive their data from this signal.
 */
export interface ItemStoreState {
  items: readonly Item[];
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: ItemStoreState = {
  items: [],
  loading: false,
  error: null,
};

/**
 * ItemSignalStore — the application-layer entry point for items.
 *
 * Built with `@ngrx/signals` (Angular 21 compatible). Four concerns:
 *
 *   1. **State** — `items`, `loading`, `error` are signals you read
 *      directly from the store instance.
 *   2. **Computed** — `totals` are derived from `items` via
 *      `computeTotals`, so any view that needs the running balance
 *      just reads `store.totals()`.
 *   3. **Methods** — `addItem`, `deleteItem` validate the payload
 *      with the Zod schema, delegate to the `ItemPort`, and manage
 *      `loading`/`error` accordingly.
 *   4. **Hooks** — `onInit` subscribes to the `AUTH_PORT`'s
 *      `authState$()` to (re)subscribe to the user's items
 *      collection on every login / logout / session restore.
 *
 * The store mirrors the auth subscription pattern used by the
 * `AuthStore`: open a subscription, drive the items pipeline via
 * `switchMap`, patch state on every emission. The `AUTH_PORT` is
 * the same instance the auth store uses, so the two stay in sync
 * without any direct coupling.
 *
 * Provided in root by `core/di/app.providers.ts`; binding to the
 * Firebase adapter is done there as well.
 */
export const ItemStore = signalStore(
  { providedIn: 'root' },
  withState<ItemStoreState>(INITIAL_STATE),
  withComputed((state) => ({
    totals: computed(() => computeTotals(state.items())),
  })),
  withMethods((store) => {
    const port = inject(ITEM_PORT);

    return {
      /**
       * Validate, persist, and surface errors for a new item.
       *
       * The list itself is NOT patched here — the real-time listener
       * is the single source of truth for the items array. By the
       * time this method returns, Firestore will have emitted the
       * new document and the listener will have patched state.
       */
      async addItem(uid: string, draft: ItemDraft): Promise<void> {
        const parsed = ItemSchema.safeParse(draft);
        if (!parsed.success) {
          // Use the first Zod message verbatim — the field-level
          // messages match the form's signal-form validation.
          const first = parsed.error.issues[0];
          const message = first ? first.message : 'Datos inválidos';
          patchState(store, { error: message });
          return;
        }
        patchState(store, { loading: true, error: null });
        try {
          await port.create(uid, parsed.data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          patchState(store, { loading: false, error: message });
          return;
        }
        patchState(store, { loading: false });
      },

      /**
       * Validate the id, remove the doc from Firestore, and surface
       * errors. The listener will pick up the deletion and patch
       * `items` accordingly.
       */
      async deleteItem(uid: string, itemId: string): Promise<void> {
        if (!itemId) {
          patchState(store, { error: 'Identificador inválido' });
          return;
        }
        patchState(store, { loading: true, error: null });
        try {
          await port.delete(uid, itemId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          patchState(store, { loading: false, error: message });
          return;
        }
        patchState(store, { loading: false });
      },

      /** Reset the error flag (used by the form to clear messages). */
      clearError(): void {
        patchState(store, { error: null });
      },
    };
  }),
  withHooks({
    onInit(store) {
      const port = inject(ITEM_PORT);
      const authPort = inject(AUTH_PORT);

      // Subscribe to the SAME auth-state stream the AuthStore uses.
      // `switchMap` (re)subscribes to the items collection whenever
      // the user changes (login / logout / session restore). When
      // the user is null we emit an empty array so the items list
      // is cleared.
      const sub = authPort
        .authState$()
        .pipe(
          switchMap((user: User | null) =>
            user ? port.listenItems(user.uid) : of<readonly Item[]>([]),
          ),
        )
        .subscribe({
          next: (items: readonly Item[]) => {
            patchState(store, { items, loading: false, error: null });
          },
          error: (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            patchState(store, { error: message, loading: false });
          },
        });

      // Keep the subscription alive for the lifetime of the store.
      // (NgRx SignalStore instances live for the app lifetime when
      // providedIn: 'root' — leaking the subscription is intentional.)
      void sub;
    },
  }),
);

/** Public type for the ItemStore instance. */
export type ItemStore = InstanceType<typeof ItemStore>;
