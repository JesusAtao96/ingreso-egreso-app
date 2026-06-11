import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { type Item } from '../domain/item.entity';

/**
 * Payload accepted by `ItemPort.create`.
 *
 * `fecha` is optional at the boundary so the form layer doesn't have
 * to think about it — the adapter fills in `Date.now()` if the
 * caller didn't supply one. The store never sets it (the listener
 * is the only path that produces real timestamps from Firestore).
 */
export type ItemDraft = Omit<Item, 'uid' | 'fecha'> & { fecha?: number };

/**
 * Application-level port for income/expense items.
 *
 * The ItemStore depends on this interface, not on any specific SDK.
 * The Firebase implementation lives in
 * `infrastructure/firebase-item.adapter.ts` and is bound to the
 * `ITEM_PORT` injection token by `core/di/app.providers.ts`.
 *
 * Methods:
 *   - `create(uid, draft)` — persist a new item under the user's
 *     collection. Resolves with the new document id so the store
 *     can patch state optimistically.
 *   - `delete(uid, itemId)` — remove an existing item. Resolves
 *     with void.
 *   - `listenItems(uid)` — one-shot stream of the user's items
 *     that the store re-subscribes to after every mutation. The
 *     realtime variant (`onSnapshot`) is not available in the
 *     bundled Firebase JS SDK lite, so this is a deliberate
 *     "refresh-after-mutation" fallback. MUST emit a value
 *     (including the empty array) so the store can react via
 *     `patchState`.
 *   - `refreshItems(uid)` — convenience alias for the store to
 *     re-fetch after a write. Same semantics as `listenItems`
 *     but named for intent.
 */
export interface ItemPort {
  create(uid: string, draft: ItemDraft): Promise<string>;
  delete(uid: string, itemId: string): Promise<void>;
  listenItems(uid: string): Observable<readonly Item[]>;
  refreshItems(uid: string): Observable<readonly Item[]>;
}

/**
 * Injection token for the items port. Use this in stores,
 * components, and tests so the binding can be swapped without
 * touching the production code.
 */
export const ITEM_PORT = new InjectionToken<ItemPort>('ITEM_PORT');
