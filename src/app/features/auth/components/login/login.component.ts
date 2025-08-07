import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../services';
import { numeroCedulaValidator, getErrorMessage } from '../../validators';
import { LoginRequest } from '../../../../core/models';

interface LoginState {
  isLoading: boolean;
  showPassword: boolean;
  hasInvalidCredentials: boolean;
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
    hasInvalidCredentials: false
  });

  // Formulario reactivo
  loginForm: FormGroup = this.fb.group({
    tipoCedula: ['V', [Validators.required]],
    numeroCedula: ['', [Validators.required, numeroCedulaValidator()]],
    clave: ['', [Validators.required]]
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
          const userName = (response.data?.user?.nombres ?? 'Usuario').split(' ')[0];
          const lastName = (response.data?.user?.apellidos ?? '').split(' ')[0];

          this.notificationService.showSuccess(
            '¡Inicio de sesión exitoso!',
            `Bienvenido ${userName} ${lastName}`
          );

          // Obtener la URL de retorno o usar dashboard por defecto
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          
          // Redireccionar después de un breve delay para mostrar la notificación
          setTimeout(() => {
            this.router.navigate([returnUrl]);
          }, 1500);
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
}
