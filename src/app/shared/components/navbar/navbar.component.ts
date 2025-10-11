import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../features/auth/services/auth.service';
import { AuthStorageService } from '../../../features/auth/services/auth-storage.service';
import { User } from '../../../core/models';

declare var bootstrap: any;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  // Usar signals para el usuario actual
  currentUser = computed(() => this.authService.currentUser());
  isLoggingOut = false;
  private destroy$ = new Subject<void>();
  private logoutModal: any;

  constructor(
    private authService: AuthService,
    private authStorageService: AuthStorageService,
    private router: Router
  ) {}

  /**
   * Obtiene el nombre completo del usuario desde localStorage
   */
  get userFullName(): string {
    const userData = this.authStorageService.getUserData();
    if (userData && userData.nombres && userData.apellidos) {
      return `${userData.nombres} ${userData.apellidos}`;
    }
    return 'Usuario';
  }

  /**
   * Obtiene el correo del usuario desde localStorage
   */
  get userEmail(): string {
    const userData = this.authStorageService.getUserData();
    return userData && userData.correo ? userData.correo : '';
  }

  ngOnInit(): void {
    // No necesitamos suscribirnos ya que usamos signals
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Limpiar modal si existe
    if (this.logoutModal) {
      this.logoutModal.dispose();
    }
  }

  /**
   * Muestra el modal de confirmación de logout
   */
  showLogoutModal(): void {
    const modalElement = document.getElementById('logoutModal');
    if (modalElement) {
      this.logoutModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      this.logoutModal.show();
    }
  }

  /**
   * Confirma y ejecuta el logout
   */
  confirmLogout(): void {
    this.isLoggingOut = true;

    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // El logout fue exitoso, cerrar modal
          this.hideLogoutModal();
          this.isLoggingOut = false;

          // Mostrar mensaje de éxito si es necesario
          console.log('Logout exitoso:', response.message);
        },
        error: (error) => {
          // Incluso en caso de error, el logout local se ejecuta
          this.hideLogoutModal();
          this.isLoggingOut = false;
          console.error('Error durante logout:', error);
        }
      });
  }

  /**
   * Oculta el modal de logout
   */
  private hideLogoutModal(): void {
    if (this.logoutModal) {
      this.logoutModal.hide();
    }
  }
}
