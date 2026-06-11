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
 * The course's original Firestore layout stores the user profile at
 * `{uid}/usuario`. The adapter writes that legacy-compatible profile
 * on sign-up and reads it on every auth-state change. It also falls
 * back to the newer `users/{uid}` layout so accounts created during
 * the modernization still restore correctly.
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
    await setDoc(doc(this.firestore, `${uid}/usuario`), { uid, nombre, email });
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
   * Read the legacy `{uid}/usuario` profile document first because
   * existing production/course data uses that path. If it does not
   * exist, fall back to the newer `users/{uid}` profile document. If
   * neither exists, build a profile from the Auth claims.
   */
  private async readProfile(uid: string, email: string): Promise<User> {
    const legacySnap = await getDoc(doc(this.firestore, `${uid}/usuario`));
    const profileSnap = legacySnap.exists()
      ? legacySnap
      : await getDoc(doc(this.firestore, `users/${uid}`));
    if (!profileSnap.exists()) {
      return makeUser({ uid, email });
    }
    const data = profileSnap.data() as { uid?: string; nombre?: string; email?: string };
    return makeUser({ uid, email: data.email ?? email, nombre: data.nombre });
  }
}
