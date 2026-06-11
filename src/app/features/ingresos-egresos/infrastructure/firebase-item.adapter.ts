import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { type ItemPort, type ItemDraft } from '../application/item.port';
import { makeItem, type Item } from '../domain/item.entity';

/**
 * Firestore implementation of the ItemPort.
 *
 * Items live under `users/{uid}/ingresos-egresos/items/{itemId}`.
 * The adapter uses the AngularFire MODULAR API (no
 * `@angular/fire/compat`) so the bundle stays tree-shakable.
 *
 * `listenItems` uses `collectionData` with `idField: 'uid'` so each
 * emitted record carries its Firestore document id under the `uid`
 * key — exactly what the `IncomeExpenseItem` shape expects.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseItemAdapter implements ItemPort {
  private readonly firestore = inject(Firestore);

  private collectionFor(uid: string) {
    return collection(this.firestore, `users/${uid}/ingresos-egresos/items`);
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
    await deleteDoc(doc(this.firestore, `users/${uid}/ingresos-egresos/items/${itemId}`));
  }

  listenItems(uid: string): Observable<readonly Item[]> {
    return collectionData(this.collectionFor(uid), { idField: 'uid' }).pipe(
      map((rows) => rows.map((raw) => makeItem(raw as Parameters<typeof makeItem>[0]))),
    );
  }
}
