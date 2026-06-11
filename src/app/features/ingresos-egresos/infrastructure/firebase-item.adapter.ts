import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
} from '@angular/fire/firestore';
import { Observable, defer, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { type ItemPort, type ItemDraft } from '../application/item.port';
import { makeItem, type Item } from '../domain/item.entity';

/**
 * Firestore implementation of the ItemPort.
 *
 * Items live under `{uid}/ingresos-egresos/items`. That is the
 * legacy/course Firestore layout used by the existing production
 * data for this app. The adapter uses the AngularFire MODULAR
 * API (no `@angular/fire/compat`) so the bundle stays
 * tree-shakable.
 *
 * **Realtime caveat:** The bundled `@firebase/firestore@4.7.5` is
 * the **lite** build, which does NOT support `onSnapshot`
 * (real-time listeners). The original `collectionData(...)` /
 * `collection(query(...))` therefore never emits. We work around
 * this by using `getDocs(...)` and exposing two refresh paths:
 *
 *   - `listenItems(uid)` returns a cold observable that issues
 *     one `getDocs` on subscribe. Components / stores decide when
 *     to re-subscribe (typically after every `create` / `delete`
 *     below, plus on user-visible transitions like route
 *     activation).
 *   - `refreshItems(uid)` does the same one-shot read and is the
 *     single entry point the `ItemStore` calls after every
 *     mutation.
 *
 * `idField: 'uid'` keeps the Firestore document id on the emitted
 * row under the `uid` key — exactly what `IncomeExpenseItem`
 * expects.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseItemAdapter implements ItemPort {
  private readonly firestore = inject(Firestore);

  private collectionFor(uid: string) {
    return collection(this.firestore, `${uid}/ingresos-egresos/items`);
  }

  async create(uid: string, draft: ItemDraft): Promise<string> {
    // Stamp the timestamp at write time so the entity's `fecha` is
    // set by the producer (avoids clock skew between the form and
    // the server).
    const payload: ItemDraft = { ...draft, fecha: draft.fecha ?? Date.now() };
    const ref = await addDoc(this.collectionFor(uid), payload);
    return ref.id;
  }

  async delete(uid: string, itemId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `${uid}/ingresos-egresos/items/${itemId}`));
  }

  listenItems(uid: string): Observable<readonly Item[]> {
    // Cold observable: a one-shot getDocs on every subscribe.
    // The ItemStore re-subscribes after each mutation to refresh
    // the list — that gives us "live enough" without realtime.
    return defer(() => this.fetchOnce(uid));
  }

  refreshItems(uid: string): Observable<readonly Item[]> {
    return this.fetchOnce(uid);
  }

  private fetchOnce(uid: string): Observable<readonly Item[]> {
    // Wrap the Promise in `from(...)` so Angular's change
    // detection sees an Observable (not a Promise) — keeps the
    // store wiring identical to the previous realtime version.
    return from(getDocs(query(this.collectionFor(uid)))).pipe(
      map((snap) => {
        const rows = snap.docs.map((doc) => ({
          ...(doc.data() as Record<string, unknown>),
          uid: doc.id,
        }));
        return rows.map((raw) => makeItem(raw as Parameters<typeof makeItem>[0]));
      }),
    );
  }
}
