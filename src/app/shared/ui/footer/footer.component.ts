import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

/**
 * Footer.
 *
 * The current year is a signal so tests can override it without
 * mocking `Date`. The year is computed once at construction time and
 * then exposed read-only.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  readonly year = signal(new Date().getFullYear());
}
