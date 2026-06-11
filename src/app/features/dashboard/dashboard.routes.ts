import { Routes } from '@angular/router';

/**
 * Dashboard feature routes.
 *
 * The dashboard is the SHELL for the authenticated app — it
 * composes the navbar + sidebar + footer + statistics, and
 * renders the ingresos-egresos feature (form + list) as
 * children. This is the "stacked-to-main" route shape:
 *
 *   `''` (DashboardComponent)
 *     ├── `''`           → statistics (in shell)
 *     ├── `ingreso-egreso` → ItemsComponent (form)
 *     └── `detalle`      → DetalleComponent (list with delete)
 *
 * The shell uses OnPush + signals, so when the ItemStore changes
 * the charts re-render automatically with no manual change
 * detection. The same store powers the form, so an `addItem`
 * there shows up in the dashboard charts on the next render.
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./presentation/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./presentation/estadistica.component').then(
            (m) => m.EstadisticaComponent,
          ),
      },
      {
        path: 'ingreso-egreso',
        loadComponent: () =>
          import(
            '../ingresos-egresos/presentation/items/items.component'
          ).then((m) => m.ItemsComponent),
      },
      {
        path: 'detalle',
        loadComponent: () =>
          import(
            '../ingresos-egresos/presentation/detalle/detalle.component'
          ).then((m) => m.DetalleComponent),
      },
    ],
  },
];

export default DASHBOARD_ROUTES;
