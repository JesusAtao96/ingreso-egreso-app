import { Routes } from '@angular/router';

/**
 * Auth feature routes.
 *
 * Lazy-loaded by `app.routes.ts` under `/login` and `/register`.
 * Both components are standalone and pull their dependencies
 * (AuthStore, AuthPort) from the root injector.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./presentation/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./presentation/register/register.component').then((m) => m.RegisterComponent),
  },
];

export default AUTH_ROUTES;
