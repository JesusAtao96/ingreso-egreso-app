import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';

import { AUTH_PORT } from '../../features/auth/application/auth.port';
import { FirebaseAuthAdapter } from '../../features/auth/infrastructure/firebase-auth.adapter';
import { ITEM_PORT } from '../../features/ingresos-egresos/application/item.port';
import { FirebaseItemAdapter } from '../../features/ingresos-egresos/infrastructure/firebase-item.adapter';

/**
 * Cross-cutting root providers.
 *
 * Phase 2 added the auth port binding. Phase 3 adds the items port
 * binding: any consumer of `ITEM_PORT` (the `ItemStore`) gets the
 * Firebase adapter without having to import it directly. Both
 * bindings live here so the production wiring is auditable in one
 * place.
 */
export const appProviders: (Provider | EnvironmentProviders)[] = [
  makeEnvironmentProviders([
    { provide: AUTH_PORT, useExisting: FirebaseAuthAdapter },
    { provide: ITEM_PORT, useExisting: FirebaseItemAdapter },
  ]),
];
