import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormField,
  email,
  form,
  minLength,
  required,
  submit,
} from '@angular/forms/signals';

import { AuthStore } from '../../application/auth.store';

/**
 * Login screen.
 *
 * Uses Angular 21 Signal Forms (`@angular/forms/signals`) for a fully
 * reactive, model-driven validation flow. The schema mirrors the Zod
 * `LoginSchema` from `shared/models/auth-schemas.ts` — the messages
 * are intentionally identical so the UI experience is consistent
 * regardless of where the validation is invoked.
 *
 * Submission delegates to `AuthStore.login`, which talks to the
 * `AUTH_PORT` injected adapter. When the store reports an
 * authenticated user, the component routes to the dashboard.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormField, RouterLink],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  // Model — never null. Empty string is the placeholder.
  readonly model = signal<{ email: string; password: string }>({
    email: '',
    password: '',
  });

  // Signal form bound to the model.
  readonly loginForm = form(this.model, (schema) => {
    required(schema.email, { message: 'El correo es obligatorio' });
    email(schema.email, { message: 'Ingresá un correo válido' });
    required(schema.password, { message: 'La contraseña es obligatoria' });
    minLength(schema.password, 6, {
      message: 'La contraseña debe tener al menos 6 caracteres',
    });
  });

  // Convenience signals for the template.
  readonly loading = this.authStore.loading;
  readonly authError = this.authStore.error;
  readonly isAuthenticated = this.authStore.isAuthenticated;

  constructor() {
    // When the store reports an authenticated user, route to the
    // dashboard. `effect` is the idiomatic place to react to signal
    // changes from an external source inside a component.
    effect(() => {
      if (this.isAuthenticated()) {
        void this.router.navigate(['/']);
      }
    });
  }

  onSubmit(): void {
    submit(this.loginForm, async () => {
      const { email, password } = this.model();
      await this.authStore.login(email, password);
    });
  }
}
