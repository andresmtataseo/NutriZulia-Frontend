import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

import { AuthService } from '../../../features/auth/services/auth.service';
import { AuthStorageService } from '../../../features/auth/services/auth-storage.service';
import { NotificationService } from '../../services/notification.service';
declare var bootstrap: any;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser = computed(() => this.authService.currentUser());
  private logoutModal: any;
  private changePasswordModal: any;
  isLoggingOut = false;
  isChangingPassword = false;
  private destroy$ = new Subject<void>();

  changePasswordForm!: FormGroup;

  constructor(
    private authService: AuthService,
    private authStorageService: AuthStorageService,
    private router: Router,
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {}

  /** Nombre completo (con fallback) */
  get userFullName(): string {
    const userData = this.authStorageService.getUserData();
    if (userData && userData.nombres && userData.apellidos) {
      return `${userData.nombres} ${userData.apellidos}`;
    }
    return 'Usuario';
  }

  /** Mostrar primer nombre y primer apellido */
  get userShortName(): string {
    const userData = this.authStorageService.getUserData();
    const firstName = userData?.nombres?.split(' ')?.[0] || '';
    const firstSurname = userData?.apellidos?.split(' ')?.[0] || '';
    const short = [firstName, firstSurname].filter(Boolean).join(' ');
    return short || 'Usuario';
  }

  /** Correo */
  get userEmail(): string {
    const userData = this.authStorageService.getUserData();
    return userData && userData.correo ? userData.correo : '';
  }

  /** Información adicional para el dropdown */
  get userCedula(): string {
    const userData = this.authStorageService.getUserData();
    return userData && userData.cedula ? userData.cedula : '';
  }

  /** Roles mapeados a etiquetas en español */
  get displayedRoles(): string[] {
    const rawRoles = (this.authStorageService.getUserRoles?.() ?? []) as string[];
    const toLabel = (code: string): string => {
      const c = (code || '').toUpperCase();
      if (c.includes('ADMIN')) return 'Administrador';
      if (c.includes('SUPERVISOR')) return 'Supervisor';
      if (c.includes('NUTRICIONISTA')) return 'Nutricionista';
      return code;
    };
    const labels = rawRoles.map(toLabel);
    return Array.from(new Set(labels));
  }

  ngOnInit(): void {
    // Inicializar formulario de cambio de contraseña
    this.changePasswordForm = this.fb.group({
      clave_actual: ['', [Validators.required]],
      clave_nueva: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]],
      clave_nueva_confirmacion: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Cerrar sesión */
  showLogoutModal(): void {
    const el = document.getElementById('logoutConfirmModal');
    if (el) {
      this.logoutModal = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
      this.logoutModal.show();
    }
  }

  hideLogoutModal(): void {
    if (this.logoutModal) {
      this.logoutModal.hide();
      this.logoutModal = null;
    }
  }

  confirmLogout(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    // No cerrar el modal aquí; mantenerlo abierto hasta que termine el logout
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoggingOut = false;
          this.hideLogoutModal();
        },
        error: () => {
          this.isLoggingOut = false;
          this.hideLogoutModal();
        }
      });
  }

  /** Acciones del menú */
  changePassword(): void {
    // Abrir modal de cambio de contraseña
    const el = document.getElementById('changePasswordModal');
    if (el) {
      this.changePasswordModal = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
      this.changePasswordModal.show();
      this.isChangingPassword = false;
      this.changePasswordForm.reset();
    }
  }

  hideChangePasswordModal(): void {
    if (this.changePasswordModal) {
      this.changePasswordModal.hide();
      this.changePasswordModal = null;
    }
  }

  submitChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.markChangePasswordFormTouched();
      this.notificationService.showError('Por favor, corrige los errores en el formulario.');
      return;
    }

    const { clave_actual, clave_nueva, clave_nueva_confirmacion } = this.changePasswordForm.value;

    this.isChangingPassword = true;

    this.authService.changePassword({
      clave_actual,
      clave_nueva,
      clave_nueva_confirmacion
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        const message = response.message || 'Contraseña cambiada exitosamente';
        this.notificationService.showSuccess(message, 'Cambio de contraseña');
        this.isChangingPassword = false;
        this.hideChangePasswordModal();
      },
      error: (error) => {
        // Mensaje por defecto
        let defaultMessage = 'Error al cambiar la contraseña. Intenta nuevamente.';
        if (error.status === 401) {
          defaultMessage = 'La contraseña actual es incorrecta o la sesión no está autorizada.';
        } else if (error.status === 400) {
          defaultMessage = 'Datos inválidos. Verifica que las contraseñas cumplan los requisitos y coincidan.';
        } else if (error.status === 0) {
          defaultMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        }
        const serverMessage = error.error?.message?.trim();
        const errorMessage = serverMessage || defaultMessage;

        this.notificationService.showError(errorMessage);
        this.isChangingPassword = false;
      }
    });
  }

  private markChangePasswordFormTouched(): void {
    Object.keys(this.changePasswordForm.controls).forEach(key => {
      const control = this.changePasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  getChangePasswordFieldError(controlName: string): string {
    const control = this.changePasswordForm.get(controlName);
    if (!control) return '';

    if (controlName === 'clave_nueva_confirmacion') {
      const mismatch = this.changePasswordForm.errors?.['passwordMismatch'];
      if (mismatch && control.touched) {
        return 'Las contraseñas no coinciden';
      }
    }

    if (!control.touched || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es requerido';
    if (control.errors['minlength']) return 'La nueva contraseña debe tener al menos 8 caracteres';
    if (control.errors['pattern']) return 'La nueva contraseña debe incluir mayúscula, minúscula, número y carácter especial (@$!%*?&)';

    return 'Campo inválido';
  }

  hasChangePasswordFieldError(controlName: string): boolean {
    const control = this.changePasswordForm.get(controlName);
    if (!control) return false;

    if (controlName === 'clave_nueva_confirmacion' && this.changePasswordForm.errors?.['passwordMismatch']) {
      return control.touched;
    }

    return !!(control.invalid && control.touched);
  }

  private passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const newPass = group.get('clave_nueva')?.value;
    const confirm = group.get('clave_nueva_confirmacion')?.value;
    if (!newPass || !confirm) return null;
    return newPass === confirm ? null : { passwordMismatch: true };
  };
}
