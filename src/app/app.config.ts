import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { environment } from '../environments/environment';
import { APP_ROUTES } from './app.routes';
import { appProviders } from './core/di/app.providers';

/**
 * Application configuration consumed by `bootstrapApplication`.
 *
 * Wires router, animations, HTTP client, Firebase modular
 * providers, ng2-charts with the default registerables, and
 * the cross-cutting root providers. PR4 also flipped change
 * detection from `provideZoneChangeDetection` to the
 * stable `provideZonelessChangeDetection()` provider — every
 * state read in the app is a signal, so we don't need Zone.js
 * to drive change detection.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(APP_ROUTES, withComponentInputBinding(), withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
    ...appProviders,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideCharts(withDefaultRegisterables()),
  ],
};
