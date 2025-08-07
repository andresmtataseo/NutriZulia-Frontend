import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../services';
import { numeroCedulaValidator, getErrorMessage } from '../../validators';
import { LoginRequest, ForgotPasswordRequest } from '../../../../core/models';

interface LoginState {
  isLoading: boolean;
  showPassword: boolean;
  hasInvalidCredentials: boolean;
  showForgotPasswordModal: boolean;
  isForgotPasswordLoading: boolean;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, NotificationComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  // Estado del componente usando signals
  state = signal<LoginState>({
    isLoading: false,
    showPassword: false,
    hasInvalidCredentials: false,
    showForgotPasswordModal: false,
    isForgotPasswordLoading: false
  });

  // Formulario reactivo
  loginForm: FormGroup = this.fb.group({
    tipoCedula: ['V', [Validators.required]],
    numeroCedula: ['', [Validators.required, numeroCedulaValidator()]],
    clave: ['', [Validators.required]]
  });

  // Formulario de recuperación de contraseña
  forgotPasswordForm: FormGroup = this.fb.group({
    tipoCedula: ['V', [Validators.required]],
    numeroCedula: ['', [Validators.required, numeroCedulaValidator()]]
  });

  constructor() {
    // Limpiar estado de credenciales inválidas cuando el usuario modifica los campos
    this.loginForm.get('numeroCedula')?.valueChanges.subscribe(() => {
      if (this.state().hasInvalidCredentials) {
        this.state.update(state => ({ ...state, hasInvalidCredentials: false }));
      }
    });

    this.loginForm.get('clave')?.valueChanges.subscribe(() => {
      if (this.state().hasInvalidCredentials) {
        this.state.update(state => ({ ...state, hasInvalidCredentials: false }));
      }
    });
  }

  // Getters para acceso fácil a los controles
  get tipoCedulaControl() { return this.loginForm.get('tipoCedula')!; }
  get numeroCedulaControl() { return this.loginForm.get('numeroCedula')!; }
  get claveControl() { return this.loginForm.get('clave')!; }

  // Getter para notificaciones
  get notification() {
    return this.notificationService.notification;
  }

  /**
   * Maneja el envío del formulario de login
   */
  onSubmit(): void {
    // Limpiar estado de credenciales inválidas al intentar nuevo login
    this.state.update(state => ({ ...state, hasInvalidCredentials: false }));

    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      this.notificationService.showError('Por favor, corrige los errores en el formulario.');
      return;
    }

    this.performLogin();
  }

  /**
   * Realiza el login usando el AuthService
   */
  private performLogin(): void {
    const formValue = this.loginForm.value;
    const cedula = `${formValue.tipoCedula}-${formValue.numeroCedula}`;

    const loginRequest: LoginRequest = {
      cedula,
      clave: formValue.clave
    };

    // Actualizar estado de loading
    this.state.update(state => ({ ...state, isLoading: true }));

    this.authService.login(loginRequest)
      .pipe(
        finalize(() => {
          this.state.update(state => ({ ...state, isLoading: false }));
        })
      )
      .subscribe({
        next: (response) => {
          // Obtener la URL de retorno o usar dashboard por defecto
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

          // Redireccionar inmediatamente
          this.router.navigate([returnUrl]);
        },
        error: (error) => {
          console.error('Error en login:', error);

          // Mensaje por defecto
          let defaultMessage = 'Error al iniciar sesión. Intenta nuevamente.';
          // Mensajes específicos por código de estado
          if (error.status === 401) {
            defaultMessage = 'Credenciales incorrectas. Verifica tu cédula y contraseña.';
            // Marcar campos como inválidos para mostrarlos en rojo
            this.state.update(state => ({ ...state, hasInvalidCredentials: true }));
          } else if (error.status === 0) {
            defaultMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
          }

          // Usar mensaje del servidor si está disponible y no está vacío, sino usar el mensaje por defecto
          const serverMessage = error.error?.message?.trim();
          const errorMessage = serverMessage || defaultMessage;

          this.notificationService.showError(errorMessage);
        }
      });
  }

  /**
   * Marca todos los campos del formulario como touched para mostrar errores
   */
  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.state.update(state => ({
      ...state,
      showPassword: !state.showPassword
    }));
  }

  /**
   * Obtiene el mensaje de error para un control específico
   */
  getFieldError(controlName: string): string {
    const control = this.loginForm.get(controlName);

    // Si hay credenciales inválidas, mostrar mensaje específico
    const isCredentialField = controlName === 'numeroCedula' || controlName === 'clave';
    if (this.state().hasInvalidCredentials && isCredentialField) {
      return controlName === 'numeroCedula'
        ? 'Verifica tu número de cédula'
        : 'Verifica tu contraseña';
    }

    // Validaciones normales del formulario
    if (!control || !control.touched || !control.errors) {
      return '';
    }
    return getErrorMessage(control);
  }

  /**
   * Verifica si un campo tiene errores y ha sido tocado, o si las credenciales son inválidas
   */
  hasFieldError(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    const hasValidationError = !!(control && control.invalid && control.touched);

    // Mostrar error en campos de credenciales cuando hay error 401
    const isCredentialField = controlName === 'numeroCedula' || controlName === 'clave';
    const hasInvalidCredentials = this.state().hasInvalidCredentials && isCredentialField;

    return hasValidationError || hasInvalidCredentials;
  }

  /**
   * Maneja el evento de dismissal de notificaciones
   */
  onNotificationDismissed(): void {
    this.notificationService.hide();
  }

  /**
   * Abre el modal de recuperación de contraseña
   */
  openForgotPasswordModal(): void {
    this.state.update(state => ({ ...state, showForgotPasswordModal: true }));
    // Limpiar el formulario
    this.forgotPasswordForm.reset({ tipoCedula: 'V', numeroCedula: '' });
  }

  /**
   * Cierra el modal de recuperación de contraseña
   */
  closeForgotPasswordModal(): void {
    this.state.update(state => ({
      ...state,
      showForgotPasswordModal: false,
      isForgotPasswordLoading: false
    }));
  }

  /**
   * Maneja el envío del formulario de recuperación de contraseña
   */
  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.markForgotPasswordFormTouched();
      this.notificationService.showError('Por favor, corrige los errores en el formulario.');
      return;
    }

    this.performForgotPassword();
  }

  /**
   * Realiza la solicitud de recuperación de contraseña
   */
  private performForgotPassword(): void {
    const formValue = this.forgotPasswordForm.value;
    const cedula = `${formValue.tipoCedula}-${formValue.numeroCedula}`;

    const request: ForgotPasswordRequest = { cedula };

    // Actualizar estado de loading
    this.state.update(state => ({ ...state, isForgotPasswordLoading: true }));

    this.authService.forgotPassword(request)
      .pipe(
        finalize(() => {
          this.state.update(state => ({ ...state, isForgotPasswordLoading: false }));
        })
      )
      .subscribe({
        next: (response) => {
          // Mostrar mensaje de éxito del servidor
          const message = response.message || 'Solicitud de recuperación enviada exitosamente.';
          this.notificationService.showSuccess(message, 'Solicitud enviada');

          // Cerrar modal
          this.closeForgotPasswordModal();
        },
        error: (error) => {
          console.error('Error en recuperación de contraseña:', error);

          // Mensaje por defecto
          let defaultMessage = 'Error al procesar la solicitud. Intenta nuevamente.';

          // Mensajes específicos por código de estado
          if (error.status === 404) {
            defaultMessage = 'No se encontró un usuario con esa cédula.';
          } else if (error.status === 0) {
            defaultMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
          }

          // Usar mensaje del servidor si está disponible
          const serverMessage = error.error?.message?.trim();
          const errorMessage = serverMessage || defaultMessage;

          this.notificationService.showError(errorMessage);
        }
      });
  }

  /**
   * Marca todos los campos del formulario de recuperación como touched
   */
  private markForgotPasswordFormTouched(): void {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      const control = this.forgotPasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Obtiene el mensaje de error para un control del formulario de recuperación
   */
  getForgotPasswordFieldError(controlName: string): string {
    const control = this.forgotPasswordForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }
    return getErrorMessage(control);
  }

  /**
   * Verifica si un campo del formulario de recuperación tiene errores
   */
  hasForgotPasswordFieldError(controlName: string): boolean {
    const control = this.forgotPasswordForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }
}
