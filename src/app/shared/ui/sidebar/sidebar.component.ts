import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NavbarUser } from '../navbar/navbar.component';

/**
 * Side navigation.
 *
 * Renders the user's display name, three primary links (Dashboard,
 * Ingresos/Egresos, Detalle), and a logout action.
 *
 * The logout button is rendered as an anchor that emits a `logout`
 * output — the parent component (or shell) decides where to navigate.
 * We also stop event propagation and call `Router.navigate(['/login'])`
 * from the click handler so the standalone component does not require
 * a wrapping shell to behave.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly router = inject(Router);

  user = input<NavbarUser | null>(null);
  logout = output<void>();

  onLogout(event: Event): void {
    event.preventDefault();
    this.logout.emit();
    this.router.navigate(['/login']);
  }
}
