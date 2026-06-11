import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Application shell.
 *
 * Phase 1: a router outlet only. The full shell (navbar + sidebar +
 * footer) is composed in the feature shells added in PR2+.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen">
      <router-outlet />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
