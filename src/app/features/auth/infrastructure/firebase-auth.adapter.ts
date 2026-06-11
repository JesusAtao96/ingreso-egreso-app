import { inject, Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  authState,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, from, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthPort } from '../application/auth.port';
import { makeUser, type User } from '../domain/user.entity';

/**
 * Firebase implementation of the auth port.
 *
 * Uses the AngularFire MODULAR API (no `@angular/fire/compat`) so the
 * bundle stays tree-shakable. The adapter is bound to the `AUTH_PORT`
 * injection token by `appProviders` — it is the only place in the
 * application layer that imports from `firebase/*`.
 *
 * The `users/{uid}` Firestore document is the source of truth for the
 * user profile (nombre, email). The adapter writes the profile on
 * sign-up and reads it on every auth-state change.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseAuthAdapter implements AuthPort {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signUp(nombre: string, email: string, password: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = credential.user.uid;
    // Create the matching profile document. If this fails we still
    // own a valid Firebase Auth account — but the user will land
    // without a profile. The store surfaces the rejection so the
    // component can show a meaningful error.
    await setDoc(doc(this.firestore, `users/${uid}`), { nombre, email });
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  authState$(): Observable<User | null> {
    return authState(this.auth).pipe(
      switchMap((fbUser) => {
        if (!fbUser) {
          return of(null);
        }
        return from(this.readProfile(fbUser.uid, fbUser.email ?? '')).pipe(
          catchError(() => of(makeUser({ uid: fbUser.uid, email: fbUser.email ?? '' }))),
        );
      }),
    );
  }

  /**
   * Read the `users/{uid}` profile document. If the document does not
   * exist (older accounts created before the profile collection was
   * introduced) we fall back to a profile built from the Auth claims.
   */
  private async readProfile(uid: string, email: string): Promise<User> {
    const snap = await getDoc(doc(this.firestore, `users/${uid}`));
    if (!snap.exists()) {
      return makeUser({ uid, email });
    }
    const data = snap.data() as { nombre?: string; email?: string };
    return makeUser({ uid, email: data.email ?? email, nombre: data.nombre });
  }
}
