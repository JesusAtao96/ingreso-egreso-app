import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { NavbarComponent, type NavbarUser } from '../../../shared/ui/navbar/navbar.component';
import { SidebarComponent } from '../../../shared/ui/sidebar/sidebar.component';
import { FooterComponent } from '../../../shared/ui/footer/footer.component';
import { AuthStore } from '../../auth/application/auth.store';
import { DashboardStore } from '../application/dashboard.store';

/**
 * Authenticated dashboard shell.
 *
 * Composes the chrome (navbar + sidebar + footer) and the
 * statistics view (cards + charts). The ingresos-egresos feature
 * is mounted as children of this route (see
 * `ingresos-egresos.routes.ts`); the nested `<router-outlet>`
 * renders them under the same shell.
 *
 * The dashboard ITSELF (this component) renders the statistics
 * view, the `''` route's child renders the form/list children.
 * Both come from the same store, so the charts update live
 * when items are added or removed via the form.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    SidebarComponent,
    FooterComponent,
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStore);
  private readonly dashboardStore = inject(DashboardStore);
  private readonly router = inject(Router);

  /** User object passed to the navbar/sidebar. Re-emits when the store user changes. */
  readonly navbarUser = computed<NavbarUser | null>(() => {
    const u = this.authStore.user();
    if (!u) return null;
    return { nombre: u.nombre, email: u.email };
  });

  readonly totalIngresos = this.dashboardStore.totalIngresos;
  readonly totalEgresos = this.dashboardStore.totalEgresos;
  readonly balance = this.dashboardStore.balance;
  readonly hasItems = computed(() => this.dashboardStore.count() > 0);

  onLogout(): void {
    void this.authStore.logout();
    void this.router.navigate(['/auth/login']);
  }
}
