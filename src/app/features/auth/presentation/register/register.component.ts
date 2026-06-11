import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormField,
  email,
  form,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';

import { AuthStore } from '../../application/auth.store';

/**
 * Register screen.
 *
 * Mirrors the login screen but with the extra `nombre` field and a
 * custom validator that checks `password === confirmPassword`. The
 * validator is added via `validate` so we get a Spanish message in
 * line with the Zod schema.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormField, RouterLink],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly model = signal<{
    nombre: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  readonly registerForm = form(this.model, (schema) => {
    required(schema.nombre, { message: 'El nombre es obligatorio' });
    required(schema.email, { message: 'El correo es obligatorio' });
    email(schema.email, { message: 'Ingresá un correo válido' });
    required(schema.password, { message: 'La contraseña es obligatoria' });
    minLength(schema.password, 6, {
      message: 'La contraseña debe tener al menos 6 caracteres',
    });
    required(schema.confirmPassword, {
      message: 'Confirmá la contraseña',
    });
    validate(schema.confirmPassword, ({ value }) => {
      const confirm = value();
      if (!confirm) return undefined;
      return confirm === this.model().password
        ? undefined
        : { kind: 'mismatch', message: 'Las contraseñas no coinciden' };
    });
  });

  readonly loading = this.authStore.loading;
  readonly authError = this.authStore.error;
  readonly isAuthenticated = this.authStore.isAuthenticated;

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        void this.router.navigate(['/']);
      }
    });
  }

  onSubmit(): void {
    submit(this.registerForm, async () => {
      const { nombre, email, password } = this.model();
      await this.authStore.register(nombre, email, password);
    });
  }
}
