import { Routes } from '@angular/router';
import { authGuardFn } from './core/guards/auth.guard';

/**
 * Top-level route table.
 *
 * - `/auth/login` and `/auth/register` come from the auth feature
 *   routes (loaded lazily as a single chunk to keep the initial
 *   bundle small).
 * - `/login` and `/register` are kept as redirects so existing
 *   links and the smoke test keep working.
 * - The root `''` path lazy-loads the **dashboard** feature. The
 *   dashboard is the authenticated shell — it composes the
 *   navbar + sidebar + footer + statistics, and the
 *   ingresos-egresos form / list are mounted as children
 *   (`/ingreso-egreso` and `/detalle`).
 * - Wildcard `**` redirects to root.
 */
export const APP_ROUTES: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: 'auth/register', pathMatch: 'full' },
  {
    path: '',
    canActivate: [authGuardFn],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (m) => m.DASHBOARD_ROUTES,
      ),
  },
  { path: '**', redirectTo: '' },
];
